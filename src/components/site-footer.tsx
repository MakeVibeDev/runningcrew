export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <p>주식회사 메이크바이브</p>
            <p>대표이사: 안계준</p>
            <p>사업자등록번호: 821-81-03776</p>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-border/20 pt-2 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © 2025 MakeVibe Inc. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
