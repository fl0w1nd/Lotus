export function Footer({ version }: { version?: string }) {
  return (
    <footer className="border-t border-line py-5">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 text-xs text-faint sm:px-6">
        <p>
          Powered by{" "}
          <a
            href="https://github.com/nezhahq/nezha"
            target="_blank"
            rel="noreferrer"
            className="text-muted transition-colors hover:text-fg"
          >
            Nezha
          </a>
          {version ? <span className="font-mono"> v{version}</span> : null}
        </p>
        <p>
          Theme <span className="font-medium text-muted">Lotus</span>
        </p>
      </div>
    </footer>
  );
}
