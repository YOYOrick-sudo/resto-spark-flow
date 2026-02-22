import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { nestoToast } from '@/lib/nestoToast';
import { nextDay, set, startOfWeek, addWeeks, isAfter } from 'date-fns';

export interface WeekplanPost {
  day: string;
  time: string;
  platform: string;
  content_type: string;
  caption: string;
  hashtags: string[];
  photo_suggestion: string;
}

const DAY_MAP: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  zondag: 0,
  maandag: 1,
  dinsdag: 2,
  woensdag: 3,
  donderdag: 4,
  vrijdag: 5,
  zaterdag: 6,
};

function computeScheduledAt(day: string, time: string): string {
  const dayNum = DAY_MAP[day.toLowerCase()];
  if (dayNum === undefined) {
    // Fallback: tomorrow at 11:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    return tomorrow.toISOString();
  }

  const [hours, minutes] = (time || '11:00').split(':').map(Number);
  const now = new Date();

  // Find the next occurrence of this day starting from next Monday
  const mondayThisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const nextMonday = addWeeks(mondayThisWeek, isAfter(now, mondayThisWeek) ? 1 : 0);

  // Calculate the target date
  const daysFromMonday = dayNum === 0 ? 6 : dayNum - 1; // Convert to Monday-based offset
  const targetDate = new Date(nextMonday);
  targetDate.setDate(nextMonday.getDate() + daysFromMonday);
  targetDate.setHours(hours || 11, minutes || 0, 0, 0);

  // If the target is in the past, push a week ahead
  if (targetDate <= now) {
    targetDate.setDate(targetDate.getDate() + 7);
  }

  return targetDate.toISOString();
}

export function useScheduleWeekplan() {
  const queryClient = useQueryClient();
  const { currentLocation } = useUserContext();

  return useMutation({
    mutationFn: async ({ posts, status }: { posts: WeekplanPost[]; status: 'scheduled' | 'draft' }) => {
      if (!currentLocation) throw new Error('No location selected');

      const rows = posts.map((post) => ({
        location_id: currentLocation.id,
        platform: post.platform,
        content_text: post.caption,
        hashtags: post.hashtags,
        content_type_tag: post.content_type,
        scheduled_at: computeScheduledAt(post.day, post.time),
        status,
        ai_generated: true,
      }));

      const { error } = await supabase
        .from('marketing_social_posts')
        .insert(rows);

      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['brand-intelligence'] });
      if (status === 'scheduled') {
        nestoToast.success(`${count} posts ingepland voor deze week`);
      } else {
        nestoToast.success(`${count} concepten toegevoegd`);
      }
    },
    onError: () => {
      nestoToast.error('Inplannen mislukt');
    },
  });
}
