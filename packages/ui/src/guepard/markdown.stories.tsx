import type { Meta, StoryObj } from '@storybook/react';

import { Markdown } from './markdown';

const meta: Meta<typeof Markdown> = {
  title: 'Design System/Markdown',
  component: Markdown,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Markdown>;

// ---------------------------------------------------------------------------
// Short permissions-style help (matches the shape the integrations app
// help pages will render)
// ---------------------------------------------------------------------------

export const HelpPage: Story = {
  name: 'Help page (short)',
  args: {
    source: `# Required AWS permissions

Attach an IAM policy that covers identity, RDS discovery, snapshots,
and EC2 provisioning to the user or role whose access keys you paste
into Guepard. See the
[AWS IAM policy docs](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_create.html).

## \`sts:GetCallerIdentity\`

Used by **Test connection** to verify the credentials.

## \`ec2:DescribeRegions\`

Used by **Show regions** to list the regions the key can reach.

## Example policy

\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity",
        "ec2:DescribeRegions",
        "rds:DescribeDBInstances",
        "rds:DescribeDBSnapshots",
        "ec2:RunInstances"
      ],
      "Resource": "*"
    }
  ]
}
\`\`\`
`,
  },
};

// ---------------------------------------------------------------------------
// Every top-level markdown feature the prose plugin + GFM handles
// ---------------------------------------------------------------------------

export const AllFeatures: Story = {
  name: 'All features (headings, lists, tables, code, links)',
  args: {
    source: `# Heading 1

Paragraph with **bold**, *italic*, ~~strikethrough~~, and \`inline code\`.
A [link to react-markdown](https://github.com/remarkjs/react-markdown).

## Heading 2

### Heading 3

#### Heading 4

- Bulleted list
- With **rich** formatting
  - Nested item
  - Another nested item
- Back to top level

1. Numbered list
2. Second item
3. Third item

> A blockquote. Typography styles the left border and italics
> automatically.

## Tables

| Column | Type | Description |
| ------ | ---- | ----------- |
| \`id\` | \`uuid\` | Primary key |
| \`name\` | \`text\` | Human-friendly label |
| \`created_at\` | \`timestamptz\` | Audit timestamp |

## Fenced code block

\`\`\`ts
import { Markdown } from '@guepard/ui/markdown';

export function HelpPage() {
  return <Markdown source="# Hello" />;
}
\`\`\`

## Task list

- [x] Shared component in \`@guepard/ui\`
- [x] Storybook story
- [ ] Per-locale content
- [ ] Syntax highlighting
`,
  },
};

// ---------------------------------------------------------------------------
// Narrow container — simulates how the docs-panel sidebar renders it
// ---------------------------------------------------------------------------

export const NarrowContainer: Story = {
  name: 'Narrow container (docs panel width)',
  render: (args) => (
    <div className="border-border bg-background w-[360px] border">
      <Markdown {...args} />
    </div>
  ),
  args: {
    source: `# Narrow sidebar

When the component renders inside a ~360px-wide container (e.g. the
shell's documentation panel), long code blocks scroll horizontally,
tables scroll, and headings stay readable.

## Long path

\`packages/integrations-drivers/src/aws/aws-driver.ts\`

## Wide table

| A | B | C | D | E |
| - | - | - | - | - |
| 1 | 2 | 3 | 4 | 5 |
| 6 | 7 | 8 | 9 | 10 |

## Long code block

\`\`\`bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \\
  --member="serviceAccount:guepard-runtime@YOUR_PROJECT_ID.iam.gserviceaccount.com" \\
  --role="roles/browser"
\`\`\`
`,
  },
};

// ---------------------------------------------------------------------------
// Empty source — confirms the component renders nothing gracefully
// ---------------------------------------------------------------------------

export const Empty: Story = {
  name: 'Empty source',
  args: {
    source: '',
  },
};
