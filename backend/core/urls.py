from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    # Admin panel API (superuser-only) — /api/admin/...
    path('admin/', include('core.admin_api.urls')),

    # Auth
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/google/', views.GoogleAuthView.as_view(), name='google_auth'),
    path('auth/apple/', views.AppleAuthView.as_view(), name='apple_auth'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/forgot-password/', views.ForgotPasswordView.as_view(), name='forgot_password'),
    path('auth/delete-account/', views.DeleteAccountView.as_view(), name='delete_account'),

    path('webhooks/revenuecat/', views.RevenueCatWebhookView.as_view(), name='revenuecat_webhook'),

    # Profile
    path('profile/', views.ProfileView.as_view(), name='profile'),

    # Workouts (exercise-stats before workouts/ so it is not swallowed)
    path('workouts/exercise-stats/', views.ExerciseLifetimeStatsView.as_view(), name='workout_exercise_stats'),
    path('workouts/', views.WorkoutListCreateView.as_view(), name='workouts'),

    # Badges
    path('badges/', views.BadgeListView.as_view(), name='badges'),
    path('badges/sync/', views.BadgeSyncView.as_view(), name='badge_sync'),
    path('user-badges/', views.UserBadgeListView.as_view(), name='user_badges'),
    path('daily-tips/', views.DailyTipListView.as_view(), name='daily_tips'),

    path(
        'notification-presets/',
        views.NotificationPresetBundleView.as_view(),
        name='notification_presets',
    ),

    # Leaderboard
    path('leaderboard/', views.LeaderboardView.as_view(), name='leaderboard'),

    # Follow system
    path('follows/<int:user_id>/', views.FollowToggleView.as_view(), name='follow_toggle'),
    path('friends/', views.FriendsListView.as_view(), name='friends_list'),

    # Feed
    path('feed/', views.FeedListView.as_view(), name='feed'),
    path('feed/<uuid:feed_id>/like/', views.FeedReactionToggleView.as_view(), name='feed_like_toggle'),
    path('feed/<uuid:feed_id>/react/', views.FeedReactionToggleView.as_view(), name='feed_react_toggle'),

    # Groups
    path('groups/', views.GroupListCreateView.as_view(), name='groups'),
    path('group-invites/', views.GroupInviteListView.as_view(), name='group_invites'),
    path('group-invites/<uuid:pk>/accept/', views.GroupInviteAcceptView.as_view(), name='group_invite_accept'),
    path('group-invites/<uuid:pk>/decline/', views.GroupInviteDeclineView.as_view(), name='group_invite_decline'),
    path('groups/<uuid:pk>/', views.GroupDetailView.as_view(), name='group_detail'),
    path('groups/<uuid:pk>/invites/', views.GroupInviteCreateView.as_view(), name='group_invite_create'),
    path('groups/<uuid:pk>/join/', views.GroupJoinView.as_view(), name='group_join'),
    path('groups/<uuid:pk>/leave/', views.GroupLeaveView.as_view(), name='group_leave'),
    path('groups/<uuid:pk>/members/<int:user_id>/', views.GroupRemoveMemberView.as_view(), name='group_remove_member'),

    # Groups – feed, leaderboard & challenges
    path('groups/<uuid:pk>/feed/', views.GroupFeedView.as_view(), name='group_feed'),
    path('groups/<uuid:pk>/leaderboard/', views.GroupLeaderboardView.as_view(), name='group_leaderboard'),
    path('groups/<uuid:pk>/challenges/', views.GroupChallengeListCreateView.as_view(), name='group_challenges'),

    # Challenges (participations before detail to avoid uuid capturing "participations")
    path('challenges/participations/', views.UserChallengeParticipationsView.as_view(), name='challenge_participations'),
    path('challenges/<uuid:pk>/', views.ChallengeDetailView.as_view(), name='challenge_detail'),
    path('challenges/<uuid:pk>/join/', views.ChallengeJoinView.as_view(), name='challenge_join'),

    # Workout Templates
    path('templates/library/', views.WorkoutLibraryListView.as_view(), name='templates_library'),
    path('templates/library/<uuid:pk>/copy/', views.WorkoutLibraryCopyView.as_view(), name='template_library_copy'),
    path('templates/', views.WorkoutTemplateListCreateView.as_view(), name='templates'),
    path('templates/<uuid:pk>/', views.WorkoutTemplateDetailView.as_view(), name='template_detail'),
    path('templates/<uuid:pk>/clone/', views.TemplateCloneView.as_view(), name='template_clone'),

    # Personal Records
    path('personal-records/', views.PersonalRecordListView.as_view(), name='personal_records'),

    # Users – search, public profile, followers/following
    path('users/search/', views.UserSearchView.as_view(), name='user_search'),
    path('users/<int:pk>/', views.UserPublicProfileView.as_view(), name='user_profile'),
    path('users/<int:pk>/followers/', views.FollowerListView.as_view(), name='user_followers'),
    path('users/<int:pk>/following/', views.FollowingListView.as_view(), name='user_following'),
]
