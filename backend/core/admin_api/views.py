from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import (
    Profile,
    Workout,
    Group,
    Challenge,
    DailyTip,
    WorkoutLibraryTemplate,
    NotificationPersonalityPreset,
    Badge,
)
from .pagination import AdminPagination
from .permissions import IsSuperuser
from . import serializers as s

User = get_user_model()


# ── Auth ──────────────────────────────────────────────────────────────────

class AdminLoginView(APIView):
    """POST /api/admin/auth/login/ — superuser-only login returning JWT tokens."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''
        if not email or not password:
            return Response(
                {'detail': 'Email and password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = User.objects.get(email__iexact=email)
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
        if not user.is_superuser:
            return Response(
                {'detail': 'This account is not authorized for the admin panel.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'is_superuser': user.is_superuser,
            },
        })


class AdminMeView(APIView):
    """GET /api/admin/auth/me/ — verify the current admin session."""

    permission_classes = [IsSuperuser]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'email': user.email,
            'is_superuser': user.is_superuser,
        })


# ── Metrics ─────────────────────────────────────────────────────────────────

class AdminMetricsView(APIView):
    permission_classes = [IsSuperuser]

    def get(self, request):
        today = timezone.now().date()
        d7 = today - timedelta(days=7)
        d30 = today - timedelta(days=30)

        users_total = User.objects.count()
        paying_users = Profile.objects.filter(is_pro=True).count()
        conversion_rate = round((paying_users / users_total) * 100, 1) if users_total else 0.0

        # 30-day continuous time series for signups and workouts.
        series_start = today - timedelta(days=29)
        signups_map = {
            row['day']: row['count']
            for row in (
                User.objects.filter(date_joined__date__gte=series_start)
                .annotate(day=TruncDate('date_joined'))
                .values('day')
                .annotate(count=Count('id'))
            )
        }
        workouts_map = {
            row['day']: row['count']
            for row in (
                Workout.objects.filter(workout_date__gte=series_start)
                .annotate(day=TruncDate('workout_date'))
                .values('day')
                .annotate(count=Count('id'))
            )
        }
        signups_series = []
        workouts_series = []
        for i in range(30):
            day = series_start + timedelta(days=i)
            iso = day.isoformat()
            signups_series.append({'date': iso, 'count': signups_map.get(day, 0)})
            workouts_series.append({'date': iso, 'count': workouts_map.get(day, 0)})

        return Response({
            'users_total': users_total,
            'users_new_7d': User.objects.filter(date_joined__date__gte=d7).count(),
            'users_new_30d': User.objects.filter(date_joined__date__gte=d30).count(),
            'paying_users': paying_users,
            'conversion_rate': conversion_rate,
            'active_users_7d': (
                Workout.objects.filter(workout_date__gte=d7).values('user').distinct().count()
            ),
            'active_users_30d': (
                Workout.objects.filter(workout_date__gte=d30).values('user').distinct().count()
            ),
            'workouts_total': Workout.objects.count(),
            'workouts_7d': Workout.objects.filter(workout_date__gte=d7).count(),
            'workouts_30d': Workout.objects.filter(workout_date__gte=d30).count(),
            'groups_total': Group.objects.count(),
            'signups_series': signups_series,
            'workouts_series': workouts_series,
        })


# ── Users ─────────────────────────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsSuperuser]
    pagination_class = AdminPagination
    serializer_class = s.AdminUserListSerializer

    def get_queryset(self):
        qs = User.objects.select_related('profile').order_by('-date_joined')
        p = self.request.query_params
        search = (p.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(email__icontains=search) | Q(profile__username__icontains=search)
            )
        is_pro = p.get('is_pro')
        if is_pro in ('true', 'false'):
            qs = qs.filter(profile__is_pro=(is_pro == 'true'))
        is_active = p.get('is_active')
        if is_active in ('true', 'false'):
            qs = qs.filter(is_active=(is_active == 'true'))
        ordering = p.get('ordering')
        allowed_ordering = {
            'date_joined', '-date_joined', 'email', '-email',
            'profile__xp', '-profile__xp', 'profile__total_workouts', '-profile__total_workouts',
        }
        if ordering in allowed_ordering:
            qs = qs.order_by(ordering)
        return qs


class AdminUserDetailView(APIView):
    permission_classes = [IsSuperuser]

    def get_object(self, pk):
        return get_object_or_404(User.objects.select_related('profile'), pk=pk)

    def get(self, request, pk):
        user = self.get_object(pk)
        return Response(s.AdminUserDetailSerializer(user).data)

    def patch(self, request, pk):
        user = self.get_object(pk)
        profile = getattr(user, 'profile', None)
        data = request.data

        if 'is_pro' in data and profile is not None:
            profile.is_pro = bool(data['is_pro'])
            if not profile.is_pro:
                profile.pro_expires_at = None
            profile.save(update_fields=['is_pro', 'pro_expires_at', 'updated_at'])

        if 'is_active' in data:
            if user.id == request.user.id and not bool(data['is_active']):
                return Response(
                    {'detail': 'You cannot deactivate your own account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.is_active = bool(data['is_active'])
            user.save(update_fields=['is_active'])

        user = self.get_object(pk)
        return Response(s.AdminUserDetailSerializer(user).data)

    def delete(self, request, pk):
        user = self.get_object(pk)
        if user.id == request.user.id:
            return Response(
                {'detail': 'You cannot delete your own account here.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user.is_superuser:
            return Response(
                {'detail': 'Cannot delete a superuser account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Workouts & social ───────────────────────────────────────────────────────

class AdminWorkoutViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsSuperuser]
    pagination_class = AdminPagination
    serializer_class = s.AdminWorkoutSerializer

    def get_queryset(self):
        qs = Workout.objects.select_related('user')
        p = self.request.query_params
        user_id = p.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
        date_from = p.get('date_from')
        if date_from:
            qs = qs.filter(workout_date__gte=date_from)
        date_to = p.get('date_to')
        if date_to:
            qs = qs.filter(workout_date__lte=date_to)
        return qs


class AdminGroupViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSuperuser]
    pagination_class = AdminPagination
    http_method_names = ['get', 'delete', 'head', 'options']

    def get_queryset(self):
        return (
            Group.objects.select_related('created_by')
            .annotate(member_count=Count('members', distinct=True))
            .order_by('-created_at')
        )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return s.AdminGroupDetailSerializer
        return s.AdminGroupSerializer


class AdminChallengeViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsSuperuser]
    pagination_class = AdminPagination
    serializer_class = s.AdminChallengeSerializer

    def get_queryset(self):
        qs = Challenge.objects.select_related('group').order_by('-created_at')
        group_id = self.request.query_params.get('group')
        if group_id:
            qs = qs.filter(group_id=group_id)
        return qs


# ── Content CRUD ─────────────────────────────────────────────────────────────

class DailyTipViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSuperuser]
    pagination_class = AdminPagination
    serializer_class = s.DailyTipSerializer
    queryset = DailyTip.objects.all()


class WorkoutLibraryTemplateViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSuperuser]
    pagination_class = AdminPagination
    serializer_class = s.WorkoutLibraryTemplateSerializer
    queryset = WorkoutLibraryTemplate.objects.all()


class NotificationPresetViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSuperuser]
    pagination_class = AdminPagination
    serializer_class = s.NotificationPresetSerializer
    queryset = NotificationPersonalityPreset.objects.all()


class BadgeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsSuperuser]
    pagination_class = AdminPagination
    serializer_class = s.BadgeSerializer
    queryset = Badge.objects.all().order_by('requirement_type', 'requirement_value')
