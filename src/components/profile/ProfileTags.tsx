interface ProfileTagsProps {
  title: string;
  tags: string[];
}

export function ProfileTags({ title, tags }: ProfileTagsProps) {
  if (!tags.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 text-xs rounded-full bg-secondary text-secondary-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}