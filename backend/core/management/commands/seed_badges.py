from django.core.management.base import BaseCommand
from core.seed_badges import seed


class Command(BaseCommand):
    help = 'Seed default badges into the database'

    def handle(self, *args, **options):
        seed()
        self.stdout.write(self.style.SUCCESS('Successfully seeded default badges'))
