import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_workoutlibrarytemplate'),
        ('core', '0009_expand_workout_library_sources'),
    ]

    operations = [
        migrations.AddField(
            model_name='workoutfeed',
            name='group',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='feed_items',
                to='core.group',
            ),
        ),
        migrations.AddIndex(
            model_name='workoutfeed',
            index=models.Index(fields=['group', '-created_at'], name='core_workou_group_i_idx'),
        ),
    ]
