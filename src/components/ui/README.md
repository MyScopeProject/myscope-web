# MyScope Design System

A comprehensive UI component library built with **React**, **TypeScript**, and **Tailwind CSS** for the MyScope platform.

## 🎨 Design Tokens

### Colors
- **Primary**: `#10B981` (Emerald Green)
- **Secondary**: `#6366F1` (Indigo)
- **Accent**: `#F472B6` (Pink)
- **Background**: `#0F172A` (Slate 950)
- **Surface**: `#1E293B` (Gray 800)
- **Text Primary**: `#F1F5F9` (Slate 100)
- **Text Secondary**: `#CBD5E1` (Gray 400)

### Typography
- **Heading Font**: 'Poppins', sans-serif
- **Body Font**: 'Inter', sans-serif

### Gradients
- **Brand**: `linear-gradient(90deg, #10B981, #6366F1)`
- **Accent**: `linear-gradient(90deg, #F472B6, #6366F1)`

---

## 📦 Components

### Button

Versatile button component with multiple variants and sizes.

**Usage:**
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>
```

**Props:**
- `variant`: `'primary'` | `'secondary'` | `'accent'` | `'outline'` | `'ghost'`
- `size`: `'sm'` | `'md'` | `'lg'`
- `isLoading`: boolean (shows loading spinner)
- `disabled`: boolean

**Examples:**
```tsx
<Button variant="primary">Primary Button</Button>
<Button variant="outline" size="lg">Large Outline</Button>
<Button variant="accent" isLoading>Loading...</Button>
```

---

### Card

Container component with sections for structured content.

**Usage:**
```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui';

<Card hoverable gradient>
  <CardHeader>Card Title</CardHeader>
  <CardBody>Main content here</CardBody>
  <CardFooter>Footer content</CardFooter>
</Card>
```

**Props:**
- `hoverable`: boolean (adds hover effect)
- `gradient`: boolean (adds gradient border)

---

### Typography

Consistent text components with brand styling.

**Usage:**
```tsx
import { Heading, Paragraph, TextLink, SmallText } from '@/components/ui';

<Heading level={1} gradient>Main Title</Heading>
<Heading level={2}>Subtitle</Heading>
<Paragraph size="lg" muted>Body text here</Paragraph>
<TextLink href="/page">Link text</TextLink>
<SmallText>Helper text</SmallText>
```

**Heading Props:**
- `level`: `1` | `2` | `3` | `4`
- `gradient`: boolean (applies brand gradient)

**Paragraph Props:**
- `size`: `'sm'` | `'md'` | `'lg'`
- `muted`: boolean (gray text)

**TextLink Props:**
- `href`: string
- `external`: boolean (opens in new tab)

---

### Avatar

User avatar with image or initials fallback.

**Usage:**
```tsx
import { Avatar } from '@/components/ui';

<Avatar src="/user.jpg" alt="John Doe" size="md" />
<Avatar name="Jane Smith" size="lg" />
```

**Props:**
- `src`: string (image URL)
- `alt`: string (alt text)
- `name`: string (for initials fallback)
- `size`: `'sm'` | `'md'` | `'lg'` | `'xl'`

**Features:**
- Automatic initials generation
- Gradient backgrounds based on name
- Responsive sizing

---

### Badge

Colored badges for status, categories, and tags.

**Usage:**
```tsx
import { Badge } from '@/components/ui';

<Badge variant="success">Active</Badge>
<Badge variant="warning" size="sm">Pending</Badge>
<Badge variant="danger" rounded>Error</Badge>
```

**Props:**
- `variant`: `'success'` | `'warning'` | `'danger'` | `'info'` | `'primary'` | `'secondary'`
- `size`: `'sm'` | `'md'` | `'lg'`
- `rounded`: boolean (full rounded)

---

### Input Components

Form inputs with focus and error states.

**Usage:**
```tsx
import { Input, TextArea, Select } from '@/components/ui';

<Input 
  label="Email" 
  type="email" 
  placeholder="Enter email"
  error="Invalid email"
  required
/>

<TextArea 
  label="Message" 
  rows={4}
  helperText="Max 500 characters"
/>

<Select 
  label="Genre"
  options={[
    { value: 'rock', label: 'Rock' },
    { value: 'pop', label: 'Pop' }
  ]}
/>
```

**Props:**
- `label`: string
- `error`: string (error message)
- `helperText`: string
- `required`: boolean

---

### Modal

Accessible modal dialog with overlay and animations.

**Usage:**
```tsx
import { Modal } from '@/components/ui';

<Modal 
  isOpen={isOpen} 
  onClose={handleClose}
  title="Modal Title"
  size="md"
>
  <p>Modal content here</p>
</Modal>
```

**Props:**
- `isOpen`: boolean
- `onClose`: () => void
- `title`: string (optional)
- `size`: `'sm'` | `'md'` | `'lg'` | `'xl'`

**Features:**
- Escape key to close
- Click overlay to close
- Prevents body scroll
- Smooth animations
- Fully accessible

---

## 🎯 Best Practices

### Accessibility
- All components support keyboard navigation
- Proper ARIA attributes included
- Focus states clearly visible
- Color contrast meets WCAG AA standards

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Flexible sizing options

### Performance
- Components are tree-shakeable
- Minimal bundle impact
- Optimized re-renders

---

## 🚀 Usage Examples

### Login Form
```tsx
import { Card, CardHeader, CardBody, Input, Button } from '@/components/ui';

<Card className="max-w-md mx-auto">
  <CardHeader>
    <Heading level={3}>Login</Heading>
  </CardHeader>
  <CardBody>
    <form className="space-y-4">
      <Input 
        label="Email" 
        type="email" 
        required 
      />
      <Input 
        label="Password" 
        type="password" 
        required 
      />
      <Button variant="primary" className="w-full">
        Sign In
      </Button>
    </form>
  </CardBody>
</Card>
```

### User Profile Card
```tsx
import { Card, Avatar, Badge, Paragraph } from '@/components/ui';

<Card hoverable>
  <div className="p-6 flex items-center gap-4">
    <Avatar name="John Doe" size="lg" />
    <div>
      <h3 className="font-semibold">John Doe</h3>
      <Paragraph size="sm" muted>@johndoe</Paragraph>
      <Badge variant="success" size="sm">Active</Badge>
    </div>
  </div>
</Card>
```

---

## 📝 Notes

- All components follow the MyScope brand guidelines
- Components are fully typed with TypeScript
- Tailwind CSS classes used throughout
- Framer Motion for animations in Modal component

---

**Version**: 1.0.0  
**Last Updated**: November 2025
