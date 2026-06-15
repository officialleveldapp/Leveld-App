from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0014_notification_personality_preset'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Friendship',
        ),
    ]
