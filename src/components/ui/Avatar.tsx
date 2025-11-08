/**
 * Avatar Component
 * 
 * @description User avatar with image or initials fallback
 * @usage
 * <Avatar src="/user.jpg" alt="John Doe" size="md" />
 * <Avatar name="John Doe" size="lg" />
 * 
 * @sizes sm, md, lg, xl
 */

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Avatar({ src, alt, name, size = 'md', className = '' }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-2xl',
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const gradients = [
    'bg-linear-to-br from-emerald-600 to-emerald-400',
    'bg-linear-to-br from-indigo-600 to-indigo-400',
    'bg-linear-to-br from-pink-600 to-pink-400',
    'bg-linear-to-br from-purple-600 to-purple-400',
    'bg-linear-to-br from-blue-600 to-blue-400',
  ];

  const getGradient = (name?: string) => {
    if (!name) return gradients[0];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  return (
    <div className={`${sizes[size]} rounded-full overflow-hidden flex items-center justify-center shrink-0 ${className}`}>
      {src ? (
        <img src={src} alt={alt || name || 'User avatar'} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full flex items-center justify-center ${getGradient(name)} text-white font-semibold`}>
          {name ? getInitials(name) : '??'}
        </div>
      )}
    </div>
  );
}
