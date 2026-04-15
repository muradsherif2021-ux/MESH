interface PageHeaderProps {
  titleAr: string;
  subtitleAr?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ titleAr, subtitleAr, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h1 className="text-lg font-bold text-foreground">{titleAr}</h1>
        {subtitleAr && <p className="text-sm text-muted-foreground mt-0.5">{subtitleAr}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
