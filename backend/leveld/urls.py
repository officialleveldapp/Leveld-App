from django.contrib import admin
from django.urls import path, include, re_path

from .views import PanelView, health

urlpatterns = [
    path('health/', health, name='health'),
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    # React admin SPA at /panel (client-side routing → always serve the shell)
    re_path(r'^panel/?$', PanelView.as_view(), name='panel'),
    re_path(r'^panel/(?P<path>.*)$', PanelView.as_view(), name='panel_catchall'),
]
