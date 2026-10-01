export interface AccountantTodo {
  id: string;
  title: string;
  dueDate: string | null;
  reminderEnabled: boolean;
  status: 'ACTIVE' | 'COMPLETED';
  completedAt: string | null;
  completedToday: boolean;
  isOverdue: boolean;
  isDueToday: boolean;
  userId: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    role: string;
  };
  sharedTeams?: string[];
}

export interface TodoTeam {
  id: string;
  name: string;
  extraRecipients: string[];
  reminderTime: string | null;
  isActive: boolean;
  sortOrder: number;
  memberCount?: number;
  members?: {
    id: string;
    email: string;
    displayName: string | null;
    role: string;
    isActive?: boolean;
  }[];
}
