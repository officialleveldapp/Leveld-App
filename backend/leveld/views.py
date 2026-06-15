from django.conf import settings
from django.http import FileResponse, HttpResponse, JsonResponse
from django.views import View


def health(request):
    """Lightweight liveness probe for Railway / uptime monitoring (no DB hit)."""
    return JsonResponse({'status': 'ok'})

PANEL_INDEX = settings.BASE_DIR / 'panel_dist' / 'index.html'

_MISSING_BUILD_HTML = (
    '<!doctype html><html><head><meta charset="utf-8">'
    '<title>Leveld Admin</title></head><body style="font-family:system-ui;'
    'background:#0A0A0A;color:#fff;padding:48px;max-width:640px;margin:auto">'
    '<h1>Leveld admin panel</h1>'
    '<p>The dashboard build was not found at <code>backend/panel_dist/</code>.</p>'
    '<p>Build it with:</p>'
    '<pre style="background:#1b1b1b;padding:12px;border-radius:8px">'
    'cd admin-dashboard\nnpm install\nnpm run build</pre>'
    '</body></html>'
)


class PanelView(View):
    """Serve the React admin SPA shell for any /panel/* path (client-side routing)."""

    def get(self, request, *args, **kwargs):
        if PANEL_INDEX.exists():
            response = FileResponse(open(PANEL_INDEX, 'rb'), content_type='text/html')
            response['Cache-Control'] = 'no-cache'
            return response
        return HttpResponse(_MISSING_BUILD_HTML, content_type='text/html')
