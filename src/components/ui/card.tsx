import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-background shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1 border-b border-border/40 p-5", className)} {...props} />
  );
}

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3 className={cn("text-lg font-semibold leading-tight", className)} {...props} />
  );
}

type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

export function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn("p-5", className)} {...props} />;
}
