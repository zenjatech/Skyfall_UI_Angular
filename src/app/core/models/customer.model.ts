export interface Customer {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  birthday: string | null;
  anniversary: string | null;
  specialEventDate: string | null;
  specialEventName: string | null;
  visitCount: number;
  totalSpent: number;
  lastVisit: string | null;
  createdAt: string;
}
