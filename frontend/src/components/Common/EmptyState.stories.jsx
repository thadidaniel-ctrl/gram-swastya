import EmptyState from './EmptyState';

export default {
  title: 'Common/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    icon: { control: 'text' },
    title: { control: 'text' },
    description: { control: 'text' },
    className: { control: 'text' },
    action: {
      control: 'object',
      description: 'Action configuration: { label, onClick?, to?, variant? }',
    },
  },
};

export const Default = {
  args: {
    icon: '📭',
    title: 'Nothing here',
    description: 'No items found. Try adjusting your search or filters.',
  },
};

export const WithAction = {
  args: {
    icon: '🔍',
    title: 'No results found',
    description: 'Try adjusting your search or filters to find what you need.',
    action: {
      label: 'Clear Filters',
      variant: 'secondary',
      onClick: () => alert('Clearing filters...'),
    },
  },
};

export const WithNavigation = {
  args: {
    icon: '📁',
    title: 'No files yet',
    description: 'Get started by uploading your first medical document.',
    action: {
      label: 'Upload File',
      to: '/files/upload',
      variant: 'primary',
    },
  },
};

export const WithRetry = {
  args: {
    icon: '⚠️',
    title: 'Failed to load data',
    description: 'Unable to fetch data. Please check your connection and try again.',
    action: {
      label: 'Retry',
      variant: 'primary',
      onClick: () => alert('Retrying...'),
    },
  },
};

export const CustomIcon = {
  args: {
    icon: '💊',
    title: 'No medications',
    description: 'You have no active medications. Add one to start tracking.',
    action: {
      label: 'Add Medication',
      variant: 'primary',
    },
  },
};

export const NoResults = {
  args: {
    icon: '🔍',
    title: 'No results found',
    description: 'Your search did not match any records. Try different keywords.',
  },
};

export const NoMedicines = {
  args: {
    icon: '💊',
    title: 'No active medicines',
    description: 'Add your medicines to track doses and reminders.',
    action: {
      label: 'Add Medicine',
      variant: 'primary',
      to: '/medicines',
    },
  },
};