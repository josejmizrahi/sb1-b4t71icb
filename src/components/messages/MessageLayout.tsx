import { cn } from "@/lib/utils";

interface MessageLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
  selectedConversation?: boolean;
}

export function MessageLayout({ sidebar, content, selectedConversation }: MessageLayoutProps) {
  return (
    <div className="flex h-full overflow-hidden rounded-lg border bg-background">
      {/* Sidebar - hidden on mobile when conversation is selected */}
      <div className={cn(
        "w-full md:w-80 flex-shrink-0 border-r flex flex-col",
        selectedConversation ? "hidden md:flex" : "flex"
      )}>
        {sidebar}
      </div>

      {/* Main content - full width on mobile when conversation is selected */}
      <div className={cn(
        "flex-1 flex flex-col",
        selectedConversation ? "flex" : "hidden md:flex"
      )}>
        {content}
      </div>
    </div>
  );
}