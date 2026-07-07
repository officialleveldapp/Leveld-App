from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0015_delete_friendship'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='apple_sub',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
    ]
