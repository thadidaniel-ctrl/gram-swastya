import SkeletonLoader, { SkeletonCard, SkeletonList, SkeletonStatCard } from './SkeletonLoader';

export default {
  title: 'Common/SkeletonLoader',
  component: SkeletonLoader,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    width: { control: 'text' },
    height: { control: 'text' },
    variant: {
      control: 'select',
      options: ['text', 'card', 'avatar', 'button', 'avatar-text'],
    },
    className: { control: 'text' },
    count: { control: 'number' },
  },
};

export const Default = {
  args: {},
};

export const CustomSize = {
  args: {
    width: '200px',
    height: '40px',
  },
};

export const Avatar = {
  args: {
    variant: 'avatar',
  },
};

export const Card = {
  args: {
    variant: 'card',
  },
};

export const Button = {
  args: {
    variant: 'button',
  },
};

export const Text = {
  args: {
    variant: 'text',
  },
};

export const Multiple = {
  args: {
    count: 3,
  },
};

export const SkeletonCardDefault = {
  render: () => <SkeletonLoader variant="card" width="300px" height="200px" />,
};

export const SkeletonCardWithAvatar = {
  render: () => <SkeletonCard hasAvatar={true} lines={3} />,
};

export const SkeletonCardWithImage = {
  render: () => <SkeletonCard hasImage={true} lines={2} />,
};

export const SkeletonListDefault = {
  render: () => <SkeletonList count={3} />,
};

export const SkeletonListCompact = {
  render: () => <SkeletonList count={5} itemHeight="60px" />,
};

export const SkeletonStatCardDefault = {
  render: () => <SkeletonStatCard />,
};