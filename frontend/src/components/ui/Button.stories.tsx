import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Design system/Button',
  component: Button,
  args: { children: 'Start learning' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'neon'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {};
export const Outline: Story = { args: { variant: 'outline' } };
export const Danger: Story = { args: { variant: 'danger', children: 'Delete course' } };
export const Loading: Story = { args: { loading: true, children: 'Saving…' } };
