from rest_framework.pagination import PageNumberPagination


class AdminPagination(PageNumberPagination):
    """Dedicated pagination for the admin panel (global default is None)."""

    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 200
