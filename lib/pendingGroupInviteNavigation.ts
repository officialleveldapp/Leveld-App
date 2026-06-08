import type { Router } from 'expo-router';
import { getPendingGroupInvite } from '@/lib/groupInviteStorage';

/**
 * If the user opened a group invite while signed out, resume at `/group/[id]`
 * after email/Google sign-in or sign-up (when not routed to onboarding).
 */
export async function replaceWithPendingGroupInviteIfAny(
  router: Router,
): Promise<boolean> {
  const id = await getPendingGroupInvite();
  if (!id) return false;
  router.replace({ pathname: '/group/[id]', params: { id } });
  return true;
}
