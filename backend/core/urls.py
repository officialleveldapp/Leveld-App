from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    # Auth
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/google/', views.GoogleAuthView.as_view(), name='google_auth'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/forgot-password/', views.ForgotPasswordView.as_view(), name='forgot_password'),
    path('auth/delete-account/', views.DeleteAccountView.as_view(), name='delete_account'),

    path('webhooks/revenuecat/', views.RevenueCatWebhookView.as_view(), name='revenuecat_webhook'),

    # Profile
    path('profile/', views.ProfileView.as_view(), name='profile'),

    # Workouts
    path('workouts/', views.WorkoutListCreateView.as_view(), name='workouts'),

    # Badges
    path('badges/', views.BadgeListView.as_view(), name='badges'),
    path('user-badges/', views.UserBadgeListView.as_view(), name='user_badges'),
    path('daily-tips/', views.DailyTipListView.as_view(), name='daily_tips'),

    # Leaderboard
    path('leaderboard/', views.LeaderboardView.as_view(), name='leaderboard'),

    # Follow system
    path('follows/<int:user_id>/', views.FollowToggleView.as_view(), name='follow_toggle'),
    path('friends/', views.FriendsListView.as_view(), name='friends_list'),

    # Friendships (legacy compat)
    path('friendships/', views.FriendshipListCreateView.as_view(), name='friendships'),
    path('friendships/<uuid:pk>/', views.FriendshipDetailView.as_view(), name='friendship_detail'),

    # Feed
    path('feed/', views.FeedListView.as_view(), name='feed'),
    path('feed/<uuid:feed_id>/like/', views.FeedReactionToggleView.as_view(), name='feed_like_toggle'),
    path('feed/<uuid:feed_id>/react/', views.FeedReactionToggleView.as_view(), name='feed_react_toggle'),

    # Groups
    path('groups/', views.GroupListCreateView.as_view(), name='groups'),
    path('groups/<uuid:pk>/', views.GroupDetailView.as_view(), name='group_detail'),
    path('groups/<uuid:pk>/join/', views.GroupJoinView.as_view(), name='group_join'),
    path('groups/<uuid:pk>/leave/', views.GroupLeaveView.as_view(), name='group_leave'),

    # Groups – feed, leaderboard & challenges
    path('groups/<uuid:pk>/feed/', views.GroupFeedView.as_view(), name='group_feed'),
    path('groups/<uuid:pk>/leaderboard/', views.GroupLeaderboardView.as_view(), name='group_leaderboard'),
    path('groups/<uuid:pk>/challenges/', views.GroupChallengeListCreateView.as_view(), name='group_challenges'),

    # Challenges
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
