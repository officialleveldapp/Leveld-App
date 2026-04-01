from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_migrate_friendships_to_follows'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='google_sub',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='is_pro',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='profile',
            name='pro_expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
