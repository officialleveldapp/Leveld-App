from django.db.models import F
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Workout, FeedReaction, WorkoutFeed


@receiver(post_save, sender=Workout)
def on_workout_created(sender, instance, created, **kwargs):
    if created:
        from .services import process_workout_created
        newly = process_workout_created(instance)
        instance._newly_completed_challenges = newly or []


@receiver(post_save, sender=FeedReaction)
def on_feed_reaction_created(sender, instance, created, **kwargs):
    if created:
        WorkoutFeed.objects.filter(pk=instance.feed_id).update(
            likes_count=F('likes_count') + 1
        )


@receiver(post_delete, sender=FeedReaction)
def on_feed_reaction_deleted(sender, instance, **kwargs):
    WorkoutFeed.objects.filter(pk=instance.feed_id).update(
        likes_count=F('likes_count') - 1
    )
