from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('workouts', views.AdminWorkoutViewSet, basename='admin-workouts')
router.register('groups', views.AdminGroupViewSet, basename='admin-groups')
router.register('challenges', views.AdminChallengeViewSet, basename='admin-challenges')
router.register('content/daily-tips', views.DailyTipViewSet, basename='admin-daily-tips')
router.register('content/library-templates', views.WorkoutLibraryTemplateViewSet, basename='admin-library-templates')
router.register('content/notification-presets', views.NotificationPresetViewSet, basename='admin-notification-presets')
router.register('content/badges', views.BadgeViewSet, basename='admin-badges')

urlpatterns = [
    path('auth/login/', views.AdminLoginView.as_view(), name='admin_login'),
    path('auth/me/', views.AdminMeView.as_view(), name='admin_me'),
    path('metrics/', views.AdminMetricsView.as_view(), name='admin_metrics'),
    path('users/', views.AdminUserListView.as_view(), name='admin_users'),
    path('users/<int:pk>/', views.AdminUserDetailView.as_view(), name='admin_user_detail'),
] + router.urls
