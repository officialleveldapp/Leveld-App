import json
from pathlib import Path

from django.db import migrations, models


def seed_notification_presets(apps, schema_editor):
    NotificationPersonalityPreset = apps.get_model('core', 'NotificationPersonalityPreset')
    base = Path(__file__).resolve().parent.parent / 'data' / 'notification_presets.json'
    if not base.exists():
        return
    with open(base, encoding='utf-8') as f:
        rows = json.load(f)
    for row in rows:
        NotificationPersonalityPreset.objects.update_or_create(
            slug=row['slug'],
            defaults={
                'label': row['label'],
                'subtitle': row.get('subtitle', ''),
                'enabled': row.get('enabled', True),
                'sort_order': row.get('sort_order', 0),
                'motivation_messages': row['motivation_messages'],
                'workout_messages': row['workout_messages'],
                'social_messages': row['social_messages'],
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_profile_onboarding_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationPersonalityPreset',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug', models.SlugField(db_index=True, max_length=64, unique=True)),
                ('label', models.CharField(max_length=120)),
                ('subtitle', models.CharField(blank=True, default='', max_length=280)),
                ('enabled', models.BooleanField(default=True)),
                ('sort_order', models.PositiveSmallIntegerField(default=0)),
                ('motivation_messages', models.JSONField(blank=True, default=list)),
                ('workout_messages', models.JSONField(blank=True, default=list)),
                ('social_messages', models.JSONField(blank=True, default=list)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'notification personality preset',
                'verbose_name_plural': 'notification personality presets',
                'ordering': ['sort_order', 'slug'],
            },
        ),
        migrations.RunPython(seed_notification_presets, migrations.RunPython.noop),
    ]
