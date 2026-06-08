from django.db import migrations, models


def mark_existing_onboarding_done(apps, schema_editor):
    """
    New field defaults to False for all rows. Mark onboarding complete for everyone who
    had already diverged from the signup default (finished the old 3-step flow or edited profile).
    """
    Profile = apps.get_model('core', 'Profile')
    Profile.objects.exclude(
        goal='General Fitness',
        experience_level='Beginner',
    ).update(onboarding_completed=True)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0012_groupinvite'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='onboarding_completed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='profile',
            name='body_weight_lbs',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='height_inches',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='starting_bench_lbs',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='training_environment',
            field=models.CharField(blank=True, default='', max_length=32),
        ),
        migrations.AddField(
            model_name='profile',
            name='session_length_minutes',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.RunPython(mark_existing_onboarding_done, migrations.RunPython.noop),
    ]
