from django.db import migrations, models


def set_all_groups_private(apps, schema_editor):
    Group = apps.get_model('core', 'Group')
    Group.objects.all().update(is_public=False)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_workoutfeed_group'),
    ]

    operations = [
        migrations.RunPython(set_all_groups_private, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='group',
            name='is_public',
            field=models.BooleanField(default=False),
        ),
    ]
