import os
import re
import secrets

from django.contrib.auth.models import User
from django.db.models import Q, Max
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Profile, Workout, Badge, UserBadge, Friendship, Follow,
    Group, GroupMember, GroupInvite, Challenge, ChallengeParticipant,
    WorkoutFeed, FeedReaction, DailyTip,
    WorkoutTemplate, TemplateExercise, WorkoutLibraryTemplate, PersonalRecord,
    NotificationPersonalityPreset,
)
from .workout_integrity import MAX_WORKOUT_LIST
from .serializers import (
    RegisterSerializer, LoginSerializer, ForgotPasswordSerializer,
    GoogleAuthSerializer,
    ProfileSerializer, ProfilePublicSerializer,
    NotificationPersonalityPresetSerializer,
    WorkoutSerializer, WorkoutCreateSerializer,
    BadgeSerializer, UserBadgeSerializer, DailyTipSerializer,
    FollowSerializer,
    FriendshipSerializer, FriendshipCreateSerializer,
    GroupSerializer, GroupMemberSerializer, GroupInviteSerializer,
    ChallengeSerializer, ChallengeCreateSerializer,
    ChallengeParticipantSerializer,
    WorkoutFeedSerializer,
    WorkoutTemplateSerializer, WorkoutTemplateCreateSerializer,
    WorkoutLibraryTemplateSerializer, TemplateExerciseSerializer, PersonalRecordSerializer,
)


# ══════════════════════════════════════════════════════
#  AUTH
# ══════════════════════════════════════════════════════

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Return JWT tokens immediately so the app can log the user in
        refresh = RefreshToken.for_user(user)
        profile = user.profile
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
            },
            'profile': ProfileSerializer(profile).data,
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    """POST /api/auth/logout/ — client clears tokens after; this hits the server for audit/logging."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        return Response({'detail': 'Signed out.'}, status=status.HTTP_200_OK)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            return Response(
                {'detail': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        profile = user.profile
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
            },
            'profile': ProfileSerializer(profile).data,
        })


def _google_oauth_client_ids():
    raw = os.getenv('GOOGLE_OAUTH_CLIENT_IDS', '').strip()
    if not raw:
        raw = os.getenv('GOOGLE_OAUTH_CLIENT_ID', '').strip()
    return [x.strip() for x in raw.split(',') if x.strip()]


def _unique_username_from_email(email: str) -> str:
    local = (email.split('@')[0] or 'user')[:30]
    base = re.sub(r'[^a-zA-Z0-9_]', '_', local) or 'user'
    if not Profile.objects.filter(username=base).exists():
        return base
    for _ in range(48):
        candidate = f'{base}_{secrets.token_hex(3)}'
        if not Profile.objects.filter(username=candidate).exists():
            return candidate
    raise RuntimeError('username_alloc')


def _free_user_template_cap_reached(profile) -> bool:
    if profile.is_pro:
        return False
    return WorkoutTemplate.objects.filter(user=profile).count() >= 1


class GoogleAuthView(APIView):
    """POST /api/auth/google/ — verify Google ID token, return JWT like login."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['id_token']

        client_ids = _google_oauth_client_ids()
        if not client_ids:
            return Response(
                {'detail': 'Google sign-in is not configured on the server.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            audience = client_ids[0] if len(client_ids) == 1 else client_ids
            idinfo = google_id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                audience=audience,
            )
        except ValueError:
            return Response(
                {'detail': 'Invalid Google token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        sub = idinfo.get('sub')
        email = (idinfo.get('email') or '').strip().lower()
        if not sub or not email:
            return Response(
                {'detail': 'Google account has no usable email.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if idinfo.get('email_verified') is False:
            return Response(
                {'detail': 'Email not verified with Google.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        picture = idinfo.get('picture') or ''

        try:
            profile = Profile.objects.select_related('user').get(google_sub=sub)
            user = profile.user
        except Profile.DoesNotExist:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    password=secrets.token_urlsafe(32),
                )
                user.set_unusable_password()
                user.save()
                Profile.objects.create(
                    user=user,
                    username=_unique_username_from_email(email),
                    xp=0,
                    level=1,
                    current_streak=0,
                    longest_streak=0,
                    total_workouts=0,
                    google_sub=sub,
                    avatar_url=picture or None,
                )
                profile = user.profile
            else:
                # User may exist without a Profile (legacy / admin); attach or create one.
                profile, created = Profile.objects.get_or_create(
                    user=user,
                    defaults={
                        'username': _unique_username_from_email(email),
                        'google_sub': sub,
                        'avatar_url': picture or None,
                    },
                )
                if profile.google_sub and profile.google_sub != sub:
                    return Response(
                        {'detail': 'This email is linked to a different Google account.'},
                        status=status.HTTP_409_CONFLICT,
                    )
                if not created:
                    profile.google_sub = sub
                    if picture and not (profile.avatar_url or '').strip():
                        profile.avatar_url = picture
                    profile.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
            },
            'profile': ProfileSerializer(profile).data,
        })


class RevenueCatWebhookView(APIView):
    """
    POST /api/webhooks/revenuecat/ — set Profile.is_pro from RevenueCat events.
    Set REVENUECAT_WEBHOOK_SECRET and use the same value in the RC dashboard.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = []  # RevenueCat may burst; do not apply anon/user throttles

    def post(self, request):
        secret = os.getenv('REVENUECAT_WEBHOOK_SECRET', '').strip()
        auth = request.headers.get('Authorization', '')
        if not secret or auth != f'Bearer {secret}':
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

        body = request.data if isinstance(request.data, dict) else {}
        event = body.get('event') or body
        etype = (event.get('type') or event.get('event_type') or '').upper()
        app_user_id = event.get('app_user_id')
        if app_user_id is None:
            return Response({'ok': True})

        try:
            pk = int(str(app_user_id).strip())
        except (TypeError, ValueError):
            return Response({'ok': True})

        try:
            profile = Profile.objects.get(pk=pk)
        except Profile.DoesNotExist:
            return Response({'ok': True})

        grant_pro = etype in (
            'INITIAL_PURCHASE',
            'RENEWAL',
            'UNCANCELLATION',
            'NON_RENEWING_PURCHASE',
            'PRODUCT_CHANGE',
            'SUBSCRIPTION_EXTENDED',
        )
        revoke_pro = etype in (
            'EXPIRATION',
            'REFUND',
            'SUBSCRIPTION_PAUSED',
        )

        if grant_pro:
            profile.is_pro = True
            profile.pro_expires_at = None
            profile.save()
        elif revoke_pro:
            profile.is_pro = False
            profile.pro_expires_at = None
            profile.save()

        return Response({'ok': True})


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # In production, send a password reset email here.
        # For now, we just acknowledge receipt.
        return Response(
            {'detail': 'If an account with that email exists, a reset link has been sent.'},
            status=status.HTTP_200_OK,
        )


class DeleteAccountView(APIView):
    """DELETE /api/auth/delete-account/ – permanently deletes the user and all data."""

    def delete(self, request):
        user = request.user
        # Deleting the User cascades to Profile and all related data
        user.delete()
        return Response(
            {'detail': 'Account deleted successfully.'},
            status=status.HTTP_200_OK,
        )


# ══════════════════════════════════════════════════════
#  PROFILE
# ══════════════════════════════════════════════════════

class ProfileView(APIView):
    """GET current user's profile, PATCH to update it."""

    def get(self, request):
        try:
            profile = request.user.profile
        except Profile.DoesNotExist:
            return Response({'detail': 'Profile not found.'}, status=404)
        return Response(ProfileSerializer(profile).data)

    def patch(self, request):
        try:
            profile = request.user.profile
        except Profile.DoesNotExist:
            return Response({'detail': 'Profile not found.'}, status=404)
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ══════════════════════════════════════════════════════
#  WORKOUTS
# ══════════════════════════════════════════════════════

class WorkoutListCreateView(APIView):
    """
    GET  /api/workouts/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&limit=N
    POST /api/workouts/
    """

    def get(self, request):
        profile = request.user.profile
        qs = Workout.objects.filter(user=profile)

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(workout_date__gte=date_from)
        if date_to:
            qs = qs.filter(workout_date__lte=date_to)

        limit = request.query_params.get('limit')
        if limit:
            try:
                n = int(limit)
            except (TypeError, ValueError):
                n = MAX_WORKOUT_LIST
            n = max(1, min(n, MAX_WORKOUT_LIST))
            qs = qs[:n]

        return Response(WorkoutSerializer(qs, many=True).data)

    def post(self, request):
        profile = request.user.profile
        existing_badge_ids = set(
            UserBadge.objects.filter(user=profile).values_list('badge_id', flat=True)
        )
        serializer = WorkoutCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workout = serializer.save(user=profile)
        # Signal fires synchronously: stats, badges, and challenges are updated.
        new_badges = UserBadge.objects.filter(
            user=profile,
        ).exclude(badge_id__in=existing_badge_ids).select_related('badge')
        data = WorkoutSerializer(workout).data
        data['newly_earned_badges'] = BadgeSerializer(
            [ub.badge for ub in new_badges], many=True,
        ).data
        data['newly_completed_challenges'] = getattr(
            workout, '_newly_completed_challenges', [],
        )
        return Response(data, status=status.HTTP_201_CREATED)


def _aggregate_exercise_lifetime_stats(profile):
    """
    Roll up per-exercise totals from all saved workouts (JSON exercises list).
    Reps = sum of (sets * reps) per exercise entry, matching the client workout log.
    """
    totals = {}
    for w in Workout.objects.filter(user=profile).only('exercises'):
        for ex in w.exercises or []:
            name = (ex.get('name') or '').strip()
            if not name:
                continue
            try:
                n_sets = int(ex.get('sets') or 0)
            except (TypeError, ValueError):
                n_sets = 0
            try:
                reps_per_set = int(ex.get('reps') or 0)
            except (TypeError, ValueError):
                reps_per_set = 0
            if name not in totals:
                totals[name] = {'total_sets': 0, 'total_reps': 0}
            totals[name]['total_sets'] += n_sets
            totals[name]['total_reps'] += n_sets * reps_per_set
    items = [
        {
            'exercise_name': name,
            'total_sets': v['total_sets'],
            'total_reps': v['total_reps'],
        }
        for name, v in totals.items()
    ]
    items.sort(key=lambda x: (-x['total_reps'], x['exercise_name'].lower()))
    return items


class ExerciseLifetimeStatsView(APIView):
    """
    GET /api/workouts/exercise-stats/
    Lifetime sets and reps per exercise name for the authenticated user.
    """

    def get(self, request):
        profile = request.user.profile
        exercises = _aggregate_exercise_lifetime_stats(profile)
        return Response({'exercises': exercises})


# ══════════════════════════════════════════════════════
#  BADGES
# ══════════════════════════════════════════════════════

class BadgeListView(generics.ListAPIView):
    serializer_class = BadgeSerializer
    queryset = Badge.objects.all()


class UserBadgeListView(APIView):
    def get(self, request):
        profile = request.user.profile
        qs = UserBadge.objects.filter(user=profile).select_related('badge')
        return Response(UserBadgeSerializer(qs, many=True).data)


class BadgeSyncView(APIView):
    """POST /api/badges/sync/ — check for any missed badges using live workout counts."""

    def post(self, request):
        from .services import check_and_award_badges
        profile = request.user.profile
        newly_earned = check_and_award_badges(profile, use_live_counts=True)
        return Response({
            'newly_earned_badges': BadgeSerializer(newly_earned, many=True).data,
        })


class DailyTipListView(generics.ListAPIView):
    serializer_class = DailyTipSerializer

    def get_queryset(self):
        return DailyTip.objects.filter(is_active=True)


class NotificationPresetBundleView(APIView):
    """
    Authenticated clients fetch server-driven notification “vibe” copy
    (motivation / workout / social message pools per preset).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = NotificationPersonalityPreset.objects.filter(enabled=True).order_by(
            'sort_order', 'slug'
        )
        latest = qs.aggregate(m=Max('updated_at'))['m']
        data = NotificationPersonalityPresetSerializer(qs, many=True).data
        return Response(
            {
                'updated_at': latest.isoformat() if latest else None,
                'presets': data,
            }
        )


# ══════════════════════════════════════════════════════
#  LEADERBOARD
# ══════════════════════════════════════════════════════

class LeaderboardView(APIView):
    def get(self, request):
        limit = int(request.query_params.get('limit', 10))
        profiles = Profile.objects.order_by('-xp')[:limit]
        return Response(ProfilePublicSerializer(profiles, many=True).data)


# ══════════════════════════════════════════════════════
#  FRIENDSHIPS
# ══════════════════════════════════════════════════════

class FriendshipListCreateView(APIView):
    """
    GET returns three lists: friends (accepted), sent (pending), received (pending).
    POST creates a new friend request.
    """
    def get(self, request):
        profile = request.user.profile

        sent = Friendship.objects.filter(user=profile).select_related('friend', 'user')
        received = Friendship.objects.filter(friend=profile).select_related('friend', 'user')

        return Response({
            'friends': FriendshipSerializer(
                sent.filter(status='accepted') | received.filter(status='accepted'),
                many=True,
            ).data,
            'sent': FriendshipSerializer(sent.filter(status='pending'), many=True).data,
            'received': FriendshipSerializer(received.filter(status='pending'), many=True).data,
        })

    def post(self, request):
        profile = request.user.profile
        serializer = FriendshipCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        friend_id = serializer.validated_data['friend_id']

        try:
            friend_profile = Profile.objects.get(user_id=friend_id)
        except Profile.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)

        if profile == friend_profile:
            return Response({'detail': 'Cannot befriend yourself.'}, status=400)

        friendship, created = Friendship.objects.get_or_create(
            user=profile, friend=friend_profile,
            defaults={'status': 'pending'},
        )
        if not created:
            return Response({'detail': 'Friendship already exists.'}, status=400)

        return Response(FriendshipSerializer(friendship).data, status=201)


class FriendshipDetailView(APIView):
    def patch(self, request, pk):
        profile = request.user.profile
        try:
            friendship = Friendship.objects.get(
                pk=pk,
            )
        except Friendship.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        # Only the recipient can accept/reject
        if friendship.friend != profile and friendship.user != profile:
            return Response({'detail': 'Not authorized.'}, status=403)

        new_status = request.data.get('status')
        if new_status not in ('accepted', 'rejected'):
            return Response({'detail': 'Invalid status.'}, status=400)

        friendship.status = new_status
        friendship.save()
        return Response(FriendshipSerializer(friendship).data)

    def delete(self, request, pk):
        profile = request.user.profile
        try:
            friendship = Friendship.objects.get(pk=pk, user=profile)
        except Friendship.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        friendship.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ══════════════════════════════════════════════════════
#  FOLLOW SYSTEM
# ══════════════════════════════════════════════════════

class FollowToggleView(APIView):
    """POST /api/follows/<user_id>/ – follow or unfollow a user."""
    def post(self, request, user_id):
        profile = request.user.profile
        try:
            target = Profile.objects.get(user_id=user_id)
        except Profile.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)

        if profile == target:
            return Response({'detail': 'Cannot follow yourself.'}, status=400)

        existing = Follow.objects.filter(follower=profile, following=target).first()
        if existing:
            existing.delete()
            return Response({'following': False, 'followers_count': target.followers_set.count()})
        else:
            Follow.objects.create(follower=profile, following=target)
            return Response({'following': True, 'followers_count': target.followers_set.count()}, status=201)


class FollowerListView(APIView):
    """GET /api/users/<pk>/followers/"""
    def get(self, request, pk):
        try:
            target = Profile.objects.get(user_id=pk)
        except Profile.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)
        follows = Follow.objects.filter(following=target).select_related('follower')
        data = [ProfilePublicSerializer(f.follower).data for f in follows]
        return Response(data)


class FollowingListView(APIView):
    """GET /api/users/<pk>/following/"""
    def get(self, request, pk):
        try:
            target = Profile.objects.get(user_id=pk)
        except Profile.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)
        follows = Follow.objects.filter(follower=target).select_related('following')
        data = [ProfilePublicSerializer(f.following).data for f in follows]
        return Response(data)


class FriendsListView(APIView):
    """GET /api/friends/ – mutual follows (people who follow each other)."""
    def get(self, request):
        profile = request.user.profile
        following_ids = set(
            Follow.objects.filter(follower=profile).values_list('following__user_id', flat=True)
        )
        follower_ids = set(
            Follow.objects.filter(following=profile).values_list('follower__user_id', flat=True)
        )
        mutual_ids = following_ids & follower_ids
        friends = Profile.objects.filter(user_id__in=mutual_ids)
        return Response(ProfilePublicSerializer(friends, many=True).data)


# ══════════════════════════════════════════════════════
#  FEED
# ══════════════════════════════════════════════════════

class FeedListView(APIView):
    def get(self, request):
        profile = request.user.profile

        following_ids = list(
            Follow.objects.filter(follower=profile).values_list('following__user_id', flat=True)
        )
        following_ids.append(profile.user_id)

        # General posts (no group) from followed users + self
        general_q = Q(group__isnull=True, user__user_id__in=following_ids)

        # Group posts from groups the user belongs to
        my_group_ids = list(
            GroupMember.objects.filter(user=profile).values_list('group_id', flat=True)
        )
        group_q = Q(group_id__in=my_group_ids) if my_group_ids else Q(pk__in=[])

        qs = WorkoutFeed.objects.filter(
            general_q | group_q
        ).select_related('user', 'group').prefetch_related(
            'template__exercises', 'template__user', 'reactions'
        ).order_by('-created_at')[:50]

        return Response(WorkoutFeedSerializer(qs, many=True, context={'request': request}).data)

    def post(self, request):
        """Create a feed post. Optionally target a group via group_id."""
        profile = request.user.profile
        content = request.data.get('content', '').strip()
        template_id = request.data.get('template_id')
        workout_id = request.data.get('workout_id')
        group_id = request.data.get('group_id')

        if not content:
            return Response({'detail': 'Content is required.'}, status=400)

        kwargs = {'user': profile, 'content': content}

        if group_id:
            try:
                group = Group.objects.get(pk=group_id)
            except Group.DoesNotExist:
                return Response({'detail': 'Group not found.'}, status=404)
            if not GroupMember.objects.filter(group=group, user=profile).exists():
                return Response({'detail': 'You must be a member of this group to post.'}, status=403)
            kwargs['group'] = group

        if template_id:
            try:
                template = WorkoutTemplate.objects.get(pk=template_id)
                kwargs['template'] = template
            except WorkoutTemplate.DoesNotExist:
                pass
        if workout_id:
            try:
                workout = Workout.objects.get(pk=workout_id, user=profile)
                kwargs['workout'] = workout
            except Workout.DoesNotExist:
                pass

        feed_item = WorkoutFeed.objects.create(**kwargs)
        return Response(
            WorkoutFeedSerializer(feed_item, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class FeedReactionToggleView(APIView):
    """
    POST /api/feed/<feed_id>/react/
    Body: { "reaction_type": "like" | "fire" | "muscle" | "clap" | "wow" }
    - If user has no reaction → create it.
    - If user has same reaction → remove it (toggle off).
    - If user has different reaction → update it.
    """
    VALID_TYPES = {'like', 'fire', 'muscle', 'clap', 'wow'}

    def post(self, request, feed_id):
        profile = request.user.profile
        reaction_type = request.data.get('reaction_type', 'like')
        if reaction_type not in self.VALID_TYPES:
            return Response({'detail': 'Invalid reaction type.'}, status=400)

        try:
            feed_item = WorkoutFeed.objects.get(pk=feed_id)
        except WorkoutFeed.DoesNotExist:
            return Response({'detail': 'Feed item not found.'}, status=404)

        existing = FeedReaction.objects.filter(feed=feed_item, user=profile).first()
        if existing:
            if existing.reaction_type == reaction_type:
                # Toggle off — remove the reaction
                existing.delete()
                feed_item.refresh_from_db()
                summary = self._get_summary(feed_item)
                return Response({
                    'reacted': False,
                    'reaction_type': None,
                    'likes_count': feed_item.likes_count,
                    'reactions_summary': summary,
                })
            else:
                # Switch reaction type (no count change)
                existing.reaction_type = reaction_type
                existing.save()
                feed_item.refresh_from_db()
                summary = self._get_summary(feed_item)
                return Response({
                    'reacted': True,
                    'reaction_type': reaction_type,
                    'likes_count': feed_item.likes_count,
                    'reactions_summary': summary,
                })
        else:
            FeedReaction.objects.create(
                feed=feed_item, user=profile, reaction_type=reaction_type
            )
            feed_item.refresh_from_db()
            summary = self._get_summary(feed_item)
            return Response({
                'reacted': True,
                'reaction_type': reaction_type,
                'likes_count': feed_item.likes_count,
                'reactions_summary': summary,
            })

    def _get_summary(self, feed_item):
        from django.db.models import Count
        qs = feed_item.reactions.values('reaction_type').annotate(count=Count('id'))
        return {item['reaction_type']: item['count'] for item in qs}


# Keep old name as alias for URL compatibility
FeedLikeToggleView = FeedReactionToggleView


# ══════════════════════════════════════════════════════
#  GROUPS
# ══════════════════════════════════════════════════════

class GroupListCreateView(APIView):
    def get(self, request):
        profile = request.user.profile
        my_group_ids = set(
            GroupMember.objects.filter(user=profile).values_list('group_id', flat=True)
        )
        my_groups = Group.objects.filter(pk__in=my_group_ids)

        return Response({
            'my_groups': GroupSerializer(my_groups, many=True).data,
        })

    def post(self, request):
        profile = request.user.profile
        serializer = GroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group = serializer.save(created_by=profile)
        # Creator automatically becomes a member
        GroupMember.objects.create(group=group, user=profile)
        return Response(GroupSerializer(group).data, status=201)


class GroupDetailView(APIView):
    def get(self, request, pk):
        profile = request.user.profile
        try:
            group = Group.objects.get(pk=pk)
        except Group.DoesNotExist:
            return Response({'detail': 'Group not found.'}, status=404)

        members = GroupMember.objects.filter(group=group).select_related('user')
        is_member = members.filter(user=profile).exists()

        my_pending_invite_user_ids = []
        if is_member:
            my_pending_invite_user_ids = list(
                GroupInvite.objects.filter(
                    group=group, inviter=profile, status='pending'
                ).values_list('invitee__user_id', flat=True)
            )

        data = GroupSerializer(group).data
        data['members'] = GroupMemberSerializer(members, many=True).data
        data['is_member'] = is_member
        data['is_admin'] = str(group.created_by_id) == str(profile.user_id)
        data['my_pending_invite_user_ids'] = my_pending_invite_user_ids
        return Response(data)

    def patch(self, request, pk):
        profile = request.user.profile
        try:
            group = Group.objects.get(pk=pk)
        except Group.DoesNotExist:
            return Response({'detail': 'Group not found.'}, status=404)

        if str(group.created_by_id) != str(profile.user_id):
            return Response({'detail': 'Only the group admin can update settings.'}, status=403)

        allowed = {'name', 'description'}
        for field, value in request.data.items():
            if field in allowed:
                setattr(group, field, value)
        group.save()

        members = GroupMember.objects.filter(group=group).select_related('user')
        my_pending_invite_user_ids = list(
            GroupInvite.objects.filter(
                group=group, inviter=profile, status='pending'
            ).values_list('invitee__user_id', flat=True)
        )
        data = GroupSerializer(group).data
        data['members'] = GroupMemberSerializer(members, many=True).data
        data['is_member'] = True
        data['is_admin'] = True
        data['my_pending_invite_user_ids'] = my_pending_invite_user_ids
        return Response(data)

    def delete(self, request, pk):
        profile = request.user.profile
        try:
            group = Group.objects.get(pk=pk)
        except Group.DoesNotExist:
            return Response({'detail': 'Group not found.'}, status=404)

        if str(group.created_by_id) != str(profile.user_id):
            return Response({'detail': 'Only the group creator can delete this group.'}, status=403)

        group.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GroupRemoveMemberView(APIView):
    """DELETE /api/groups/<uuid:pk>/members/<int:user_id>/ — creator removes a member"""
    def delete(self, request, pk, user_id):
        profile = request.user.profile
        try:
            group = Group.objects.get(pk=pk)
        except Group.DoesNotExist:
            return Response({'detail': 'Group not found.'}, status=404)

        if str(group.created_by_id) != str(profile.user_id):
            return Response({'detail': 'Only the group creator can remove members.'}, status=403)

        if user_id == profile.user_id:
            return Response({'detail': 'Cannot remove yourself. Use leave instead.'}, status=400)

        deleted, _ = GroupMember.objects.filter(group=group, user__user_id=user_id).delete()
        if not deleted:
            return Response({'detail': 'User is not a member.'}, status=404)

        return Response({'detail': 'Member removed.'})


class GroupJoinView(APIView):
    def post(self, request, pk):
        profile = request.user.profile
        try:
            group = Group.objects.get(pk=pk)
        except Group.DoesNotExist:
            return Response({'detail': 'Group not found.'}, status=404)

        _, created = GroupMember.objects.get_or_create(group=group, user=profile)
        if not created:
            return Response({'detail': 'Already a member.'}, status=400)
        return Response({'detail': 'Joined group.'}, status=201)


class GroupLeaveView(APIView):
    def delete(self, request, pk):
        profile = request.user.profile
        deleted, _ = GroupMember.objects.filter(
            group_id=pk, user=profile
        ).delete()
        if not deleted:
            return Response({'detail': 'Not a member.'}, status=404)
        return Response(status=status.HTTP_204_NO_CONTENT)


def _are_mutual_friends(profile: Profile, other: Profile) -> bool:
    a = Follow.objects.filter(follower=profile, following=other).exists()
    b = Follow.objects.filter(follower=other, following=profile).exists()
    return a and b


class GroupInviteCreateView(APIView):
    """POST /api/groups/<uuid>/invites/ — member invites a mutual friend (in-app only)."""

    def post(self, request, pk):
        profile = request.user.profile
        raw_uid = request.data.get('user_id')
        try:
            user_id = int(raw_uid)
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid user_id.'}, status=400)

        try:
            group = Group.objects.get(pk=pk)
        except Group.DoesNotExist:
            return Response({'detail': 'Group not found.'}, status=404)

        if not GroupMember.objects.filter(group=group, user=profile).exists():
            return Response({'detail': 'You must be a member to invite people.'}, status=403)

        try:
            invitee_profile = Profile.objects.get(user_id=user_id)
        except Profile.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)

        if invitee_profile.user_id == profile.user_id:
            return Response({'detail': 'You cannot invite yourself.'}, status=400)

        if not _are_mutual_friends(profile, invitee_profile):
            return Response({'detail': 'You can only invite mutual friends.'}, status=403)

        if GroupMember.objects.filter(group=group, user=invitee_profile).exists():
            return Response({'detail': 'User is already a member.'}, status=400)

        existing = GroupInvite.objects.filter(group=group, invitee=invitee_profile).first()
        if existing:
            if existing.status == 'pending':
                return Response({'detail': 'Invite already pending.'}, status=400)
            existing.delete()

        invite = GroupInvite.objects.create(
            group=group, invitee=invitee_profile, inviter=profile, status='pending'
        )
        return Response(GroupInviteSerializer(invite).data, status=201)


class GroupInviteListView(APIView):
    """GET /api/group-invites/ — pending invites for the current user (as invitee)."""

    def get(self, request):
        profile = request.user.profile
        qs = (
            GroupInvite.objects.filter(invitee=profile, status='pending')
            .select_related('group', 'inviter')
            .order_by('-created_at')
        )
        return Response(GroupInviteSerializer(qs, many=True).data)


class GroupInviteAcceptView(APIView):
    """POST /api/group-invites/<uuid>/accept/"""

    def post(self, request, pk):
        profile = request.user.profile
        try:
            invite = GroupInvite.objects.select_related('group').get(pk=pk, invitee=profile)
        except GroupInvite.DoesNotExist:
            return Response({'detail': 'Invite not found.'}, status=404)

        if invite.status != 'pending':
            return Response({'detail': 'This invite is no longer active.'}, status=400)

        group = invite.group
        GroupMember.objects.get_or_create(group=group, user=profile)
        invite.delete()
        return Response({'detail': 'Joined group.', 'group_id': str(group.id)}, status=200)


class GroupInviteDeclineView(APIView):
    """POST /api/group-invites/<uuid>/decline/"""

    def post(self, request, pk):
        profile = request.user.profile
        try:
            invite = GroupInvite.objects.get(pk=pk, invitee=profile, status='pending')
        except GroupInvite.DoesNotExist:
            return Response({'detail': 'Invite not found.'}, status=404)

        invite.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ══════════════════════════════════════════════════════
#  WORKOUT TEMPLATES
# ══════════════════════════════════════════════════════

class WorkoutLibraryListView(APIView):
    """GET /api/templates/library/ – browse premade workout templates."""

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        category = request.query_params.get('category', '').strip()
        try:
            limit = max(1, min(int(request.query_params.get('limit', 20)), 50))
        except (TypeError, ValueError):
            limit = 20
        try:
            offset = max(0, int(request.query_params.get('offset', 0)))
        except (TypeError, ValueError):
            offset = 0

        qs = WorkoutLibraryTemplate.objects.filter(is_active=True)
        if q:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(subtitle__icontains=q) |
                Q(source_name__icontains=q)
            )
        if category:
            qs = qs.filter(category=category)

        total = qs.count()
        items = qs[offset:offset + limit]
        next_offset = offset + len(items)

        return Response({
            'results': WorkoutLibraryTemplateSerializer(items, many=True).data,
            'offset': offset,
            'next_offset': next_offset,
            'limit': limit,
            'total': total,
            'has_more': next_offset < total,
        })


class WorkoutLibraryCopyView(APIView):
    """POST /api/templates/library/<uuid:pk>/copy/ – copy a library workout to user templates."""

    def post(self, request, pk):
        profile = request.user.profile
        if _free_user_template_cap_reached(profile):
            return Response(
                {
                    'detail': 'Free accounts can save one custom workout. Upgrade to add more.',
                    'code': 'template_limit',
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            source = WorkoutLibraryTemplate.objects.get(pk=pk, is_active=True)
        except WorkoutLibraryTemplate.DoesNotExist:
            return Response({'detail': 'Library workout not found.'}, status=404)

        clone = WorkoutTemplate.objects.create(
            user=profile,
            name=source.name,
            color=source.color or '#4C91FF',
            icon=source.icon or 'dumbbell',
        )

        for idx, ex in enumerate(source.exercises or []):
            TemplateExercise.objects.create(
                template=clone,
                name=ex.get('name', 'Exercise'),
                default_sets=ex.get('default_sets', 3),
                default_reps=ex.get('default_reps', 10),
                order=ex.get('order', idx),
            )

        return Response(WorkoutTemplateSerializer(clone).data, status=status.HTTP_201_CREATED)


class WorkoutTemplateListCreateView(APIView):
    def get(self, request):
        profile = request.user.profile
        qs = WorkoutTemplate.objects.filter(user=profile).prefetch_related('exercises')
        return Response(WorkoutTemplateSerializer(qs, many=True).data)

    def post(self, request):
        profile = request.user.profile
        if _free_user_template_cap_reached(profile):
            return Response(
                {
                    'detail': 'Free accounts can save one custom workout. Upgrade to add more.',
                    'code': 'template_limit',
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = WorkoutTemplateCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        template = WorkoutTemplate.objects.create(
            user=profile,
            name=d['name'],
            color=d.get('color', '#4C91FF'),
            icon=d.get('icon', 'dumbbell'),
        )

        for idx, ex in enumerate(d.get('exercises', [])):
            TemplateExercise.objects.create(
                template=template,
                name=ex.get('name', 'Exercise'),
                default_sets=ex.get('default_sets', 3),
                default_reps=ex.get('default_reps', 10),
                order=idx,
            )

        return Response(
            WorkoutTemplateSerializer(template).data,
            status=status.HTTP_201_CREATED,
        )


class WorkoutTemplateDetailView(APIView):
    def get(self, request, pk):
        profile = request.user.profile
        try:
            template = WorkoutTemplate.objects.prefetch_related('exercises').get(
                pk=pk, user=profile,
            )
        except WorkoutTemplate.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        return Response(WorkoutTemplateSerializer(template).data)

    def put(self, request, pk):
        """Full update: replaces name, color, icon, and all exercises."""
        profile = request.user.profile
        try:
            template = WorkoutTemplate.objects.get(pk=pk, user=profile)
        except WorkoutTemplate.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        template.name = request.data.get('name', template.name)
        template.color = request.data.get('color', template.color)
        template.icon = request.data.get('icon', template.icon)
        template.save()

        # Replace exercises
        exercises_data = request.data.get('exercises')
        if exercises_data is not None:
            template.exercises.all().delete()
            for idx, ex in enumerate(exercises_data):
                TemplateExercise.objects.create(
                    template=template,
                    name=ex.get('name', 'Exercise'),
                    default_sets=ex.get('default_sets', 3),
                    default_reps=ex.get('default_reps', 10),
                    order=idx,
                )

        template.refresh_from_db()
        return Response(WorkoutTemplateSerializer(template).data)

    def delete(self, request, pk):
        profile = request.user.profile
        deleted, _ = WorkoutTemplate.objects.filter(pk=pk, user=profile).delete()
        if not deleted:
            return Response({'detail': 'Not found.'}, status=404)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ══════════════════════════════════════════════════════
#  PERSONAL RECORDS
# ══════════════════════════════════════════════════════

class PersonalRecordListView(APIView):
    """GET all PRs, POST to check & update a PR."""

    def get(self, request):
        profile = request.user.profile
        qs = PersonalRecord.objects.filter(user=profile)
        return Response(PersonalRecordSerializer(qs, many=True).data)

    def post(self, request):
        """
        Body: { exercise_name, weight, reps }
        Returns the PR object + is_new_pr boolean.
        """
        profile = request.user.profile
        name = request.data.get('exercise_name', '').strip()
        weight = float(request.data.get('weight', 0))
        reps = int(request.data.get('reps', 1))

        if not name or weight <= 0:
            return Response({'detail': 'exercise_name and weight are required.'}, status=400)

        pr, created = PersonalRecord.objects.get_or_create(
            user=profile,
            exercise_name=name,
            defaults={'weight': weight, 'reps': reps},
        )

        is_new = created
        if not created and weight > float(pr.weight):
            pr.weight = weight
            pr.reps = reps
            pr.save()
            is_new = True

        return Response({
            'pr': PersonalRecordSerializer(pr).data,
            'is_new_pr': is_new,
        })


# ══════════════════════════════════════════════════════
#  USER SEARCH / PUBLIC PROFILE
# ══════════════════════════════════════════════════════

class UserSearchView(APIView):
    """GET /api/users/search/?q=username — includes follow relationship for Add friend UI."""
    def get(self, request):
        my_profile = request.user.profile
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response([])
        profiles = list(
            Profile.objects.filter(username__icontains=q)
            .exclude(user=request.user)[:20]
        )
        if not profiles:
            return Response([])
        ids = [p.user_id for p in profiles]
        i_follow = set(
            Follow.objects.filter(
                follower=my_profile, following__user_id__in=ids
            ).values_list('following__user_id', flat=True)
        )
        follows_me = set(
            Follow.objects.filter(
                following=my_profile, follower__user_id__in=ids
            ).values_list('follower__user_id', flat=True)
        )
        out = []
        for target in profiles:
            uid = target.user_id
            is_following = uid in i_follow
            is_follower = uid in follows_me
            data = ProfilePublicSerializer(target).data
            data['is_following'] = is_following
            data['is_follower'] = is_follower
            data['is_friend'] = is_following and is_follower
            out.append(data)
        return Response(out)


class UserPublicProfileView(APIView):
    """GET /api/users/<int:pk>/  – public profile with follow info, badges, workouts, templates"""
    def get(self, request, pk):
        my_profile = request.user.profile
        try:
            target = Profile.objects.get(user_id=pk)
        except Profile.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)

        data = ProfileSerializer(target).data
        data.pop('email', None)
        data.pop('is_pro', None)
        data.pop('pro_expires_at', None)

        # Follow counts
        followers_count = target.followers_set.count()
        following_count = target.following_set.count()
        following_ids = set(
            Follow.objects.filter(follower=target).values_list('following__user_id', flat=True)
        )
        follower_ids = set(
            Follow.objects.filter(following=target).values_list('follower__user_id', flat=True)
        )
        friends_count = len(following_ids & follower_ids)

        data['followers_count'] = followers_count
        data['following_count'] = following_count
        data['friends_count'] = friends_count
        data['is_following'] = Follow.objects.filter(
            follower=my_profile, following=target
        ).exists()
        data['is_follower'] = Follow.objects.filter(
            follower=target, following=my_profile
        ).exists()
        data['is_friend'] = data['is_following'] and data['is_follower']

        viewing_self = my_profile.user_id == target.user_id
        # Other users' shared workout templates: viewer must be Pro (own profile always allowed).
        can_view_shared_templates = viewing_self or my_profile.is_pro
        # Recent activity: only mutual follows (friends), or own profile.
        can_view_activity = viewing_self or data['is_friend']

        # Earned badges
        user_badges = UserBadge.objects.filter(user=target).select_related('badge')
        data['badges'] = UserBadgeSerializer(user_badges, many=True).data

        if can_view_activity:
            workouts = Workout.objects.filter(user=target).order_by('-workout_date')[:10]
            data['recent_workouts'] = WorkoutSerializer(workouts, many=True).data
        else:
            data['recent_workouts'] = []

        if can_view_shared_templates:
            templates = WorkoutTemplate.objects.filter(user=target).prefetch_related('exercises')
            data['templates'] = WorkoutTemplateSerializer(templates, many=True).data
        else:
            data['templates'] = []

        data['can_view_shared_templates'] = can_view_shared_templates
        data['can_view_activity'] = can_view_activity

        # Legacy friendship status (compat)
        friendship = Friendship.objects.filter(
            (Q(user=my_profile, friend=target) | Q(user=target, friend=my_profile))
        ).first()
        data['friendship'] = FriendshipSerializer(friendship).data if friendship else None

        return Response(data)


# ══════════════════════════════════════════════════════
#  GROUP FEED & LEADERBOARD
# ══════════════════════════════════════════════════════

class GroupFeedView(APIView):
    """GET /api/groups/<uuid:pk>/feed/  – posts targeted to this group"""
    def get(self, request, pk):
        try:
            group = Group.objects.get(pk=pk)
        except Group.DoesNotExist:
            return Response({'detail': 'Group not found.'}, status=404)

        qs = WorkoutFeed.objects.filter(
            group=group
        ).select_related('user', 'group').prefetch_related(
            'template__exercises', 'template__user', 'reactions'
        ).order_by('-created_at')[:50]

        return Response(WorkoutFeedSerializer(qs, many=True, context={'request': request}).data)


class GroupLeaderboardView(APIView):
    """GET /api/groups/<uuid:pk>/leaderboard/ – members ranked by XP"""
    def get(self, request, pk):
        try:
            group = Group.objects.get(pk=pk)
        except Group.DoesNotExist:
            return Response({'detail': 'Group not found.'}, status=404)

        member_profiles = Profile.objects.filter(
            group_memberships__group=group
        ).order_by('-xp')

        return Response(ProfilePublicSerializer(member_profiles, many=True).data)


# ══════════════════════════════════════════════════════
#  GROUP CHALLENGES
# ══════════════════════════════════════════════════════


def _serialize_challenge_participation(p: ChallengeParticipant) -> dict:
    c = p.challenge
    g = c.group
    return {
        'id': str(p.id),
        'progress': p.progress,
        'completed': p.completed,
        'challenge': {
            'id': str(c.id),
            'name': c.name,
            'challenge_type': c.challenge_type,
            'target_value': c.target_value,
            'start_date': c.start_date,
            'end_date': c.end_date,
            'is_active': c.is_active,
        },
        'group': {
            'id': str(g.id),
            'name': g.name,
        },
    }


class UserChallengeParticipationsView(APIView):
    """GET /api/challenges/participations/ — home screen: user's group challenges."""

    def get(self, request):
        profile = request.user.profile
        in_any_group = GroupMember.objects.filter(user=profile).exists()
        qs = (
            ChallengeParticipant.objects.filter(user=profile)
            .select_related('challenge__group')
            .order_by('completed', '-challenge__end_date')
        )
        return Response({
            'in_any_group': in_any_group,
            'participations': [
                _serialize_challenge_participation(p) for p in qs
            ],
        })


class GroupChallengeListCreateView(APIView):
    """GET/POST /api/groups/<pk>/challenges/"""
    def get(self, request, pk):
        try:
            group = Group.objects.get(pk=pk)
        except Group.DoesNotExist:
            return Response({'detail': 'Group not found.'}, status=404)

        challenges = Challenge.objects.filter(group=group).prefetch_related('participants__user')
        return Response(
            ChallengeSerializer(challenges, many=True, context={'request': request}).data
        )

    def post(self, request, pk):
        profile = request.user.profile
        try:
            group = Group.objects.get(pk=pk)
        except Group.DoesNotExist:
            return Response({'detail': 'Group not found.'}, status=404)

        if not GroupMember.objects.filter(group=group, user=profile).exists():
            return Response({'detail': 'Must be a group member to create challenges.'}, status=403)

        serializer = ChallengeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        challenge = Challenge.objects.create(
            group=group,
            created_by=profile,
            name=d['name'],
            description=d.get('description', ''),
            challenge_type=d['challenge_type'],
            start_date=d['start_date'],
            end_date=d['end_date'],
            target_value=d['target_value'],
        )
        ChallengeParticipant.objects.create(challenge=challenge, user=profile)

        return Response(
            ChallengeSerializer(challenge, context={'request': request}).data,
            status=201,
        )


class ChallengeDetailView(APIView):
    """GET /api/challenges/<pk>/"""
    def get(self, request, pk):
        try:
            challenge = Challenge.objects.prefetch_related('participants__user').get(pk=pk)
        except Challenge.DoesNotExist:
            return Response({'detail': 'Challenge not found.'}, status=404)
        return Response(ChallengeSerializer(challenge, context={'request': request}).data)


class ChallengeJoinView(APIView):
    """POST /api/challenges/<pk>/join/"""
    def post(self, request, pk):
        profile = request.user.profile
        try:
            challenge = Challenge.objects.get(pk=pk)
        except Challenge.DoesNotExist:
            return Response({'detail': 'Challenge not found.'}, status=404)

        if not GroupMember.objects.filter(group=challenge.group, user=profile).exists():
            return Response({'detail': 'Must be a group member to join.'}, status=403)

        _, created = ChallengeParticipant.objects.get_or_create(
            challenge=challenge, user=profile
        )
        if not created:
            return Response({'detail': 'Already joined.'}, status=400)

        return Response(
            ChallengeSerializer(challenge, context={'request': request}).data,
            status=201,
        )


# ══════════════════════════════════════════════════════
#  TEMPLATE CLONE
# ══════════════════════════════════════════════════════

class TemplateCloneView(APIView):
    """POST /api/templates/<uuid:pk>/clone/  – copy another user's template"""
    def post(self, request, pk):
        profile = request.user.profile
        if _free_user_template_cap_reached(profile):
            return Response(
                {
                    'detail': 'Free accounts can save one custom workout. Upgrade to add more.',
                    'code': 'template_limit',
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            source = WorkoutTemplate.objects.prefetch_related('exercises').get(pk=pk)
        except WorkoutTemplate.DoesNotExist:
            return Response({'detail': 'Template not found.'}, status=404)

        # Create a copy for the current user
        clone = WorkoutTemplate.objects.create(
            user=profile,
            name=source.name,
            color=source.color,
            icon=source.icon,
        )
        for ex in source.exercises.all():
            TemplateExercise.objects.create(
                template=clone,
                name=ex.name,
                default_sets=ex.default_sets,
                default_reps=ex.default_reps,
                order=ex.order,
            )

        return Response(
            WorkoutTemplateSerializer(clone).data,
            status=status.HTTP_201_CREATED,
        )
