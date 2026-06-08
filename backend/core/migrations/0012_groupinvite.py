import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_group_all_private'),
    ]

    operations = [
        migrations.CreateModel(
            name='GroupInvite',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('declined', 'Declined')], default='pending', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invites', to='core.group')),
                ('invitee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='group_invites_received', to='core.profile')),
                ('inviter', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='group_invites_sent', to='core.profile')),
            ],
            options={
                'unique_together': {('group', 'invitee')},
            },
        ),
        migrations.AddIndex(
            model_name='groupinvite',
            index=models.Index(fields=['invitee', 'status'], name='core_groupinvite_invitee_status'),
        ),
    ]
