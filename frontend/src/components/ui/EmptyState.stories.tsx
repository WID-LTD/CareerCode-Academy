import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from './EmptyState';
import { BookOpen } from 'lucide-react';

const meta: Meta<typeof EmptyState> = {
  title: 'Design system/EmptyState',
  component: EmptyState,
  args: {
    icon: <BookOpen className="w-8 h-8" />,
    title: 'No courses yet',
    description: 'Start a free trial or browse the catalogue to find your first course.',
    action: { label: 'Browse courses', onClick: () => {} },
  },
};
export default meta;
type Story = StoryObj<typeof EmptyState>;
export const Default: Story = {};
export const WithoutAction: Story = { args: { action: undefined } };
