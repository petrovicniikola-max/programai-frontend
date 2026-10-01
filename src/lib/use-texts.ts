import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DEFAULT_TEXTS } from '@/lib/texts';

type TextOverrides = Record<string, string>;

export function useTextOverrides() {
  return useQuery({
    queryKey: ['settings', 'texts'],
    queryFn: async () => {
      const res = await api.get<TextOverrides>('/settings/texts');
      return res.data ?? {};
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTexts() {
  const { data: overrides = {} } = useTextOverrides();

  return (key: string) => {
    const v = overrides[key];
    if (typeof v === 'string' && v.length > 0) return v;
    return DEFAULT_TEXTS[key] ?? key;
  };
}

