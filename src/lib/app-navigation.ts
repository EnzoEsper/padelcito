import { useCallback } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

type AppRouter = ReturnType<typeof useRouter>;

export const PROFILE_HOME_HREF = '/(app)/profile' as const satisfies Href;
export const DISCOVER_HOME_HREF = '/(app)/discover' as const satisfies Href;
export const MATCHES_HOME_HREF = '/(app)/matches' as const satisfies Href;

export function hrefWithReturn(pathname: string, returnHref: string): Href {
  const separator = pathname.includes('?') ? '&' : '?';
  return `${pathname}${separator}returnHref=${encodeURIComponent(returnHref)}` as Href;
}

export function pushFromProfileTab(router: AppRouter, pathname: string): void {
  router.push(hrefWithReturn(pathname, PROFILE_HOME_HREF));
}

function parseReturnHrefParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return value.length > 0 ? value : undefined;
}

/** Prefer explicit returnHref (tab aux screens), else stack back, else fallback. */
export function useReturnAwareBack(fallbackHref: string = '/(app)/discover'): () => void {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnHref?: string | string[] }>();
  const returnHref = parseReturnHrefParam(params.returnHref);

  return useCallback(() => {
    if (returnHref !== undefined) {
      router.replace(returnHref as Href);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallbackHref as Href);
  }, [router, returnHref, fallbackHref]);
}

/** Explicit return target from the URL, if any. */
export function useOptionalReturnHref(): string | undefined {
  const params = useLocalSearchParams<{ returnHref?: string | string[] }>();
  return parseReturnHrefParam(params.returnHref);
}

/** Back handler plus pushes that return to this aux screen (preserving an outer return chain). */
export function useAuxScreenReturnChain(currentPathname: string): {
  goBack: () => void;
  pushWithCurrentAsReturn: (targetPathname: string) => void;
} {
  const router = useRouter();
  const optionalReturn = useOptionalReturnHref();
  const goBack = useReturnAwareBack();

  const pushWithCurrentAsReturn = useCallback(
    (targetPathname: string) => {
      const returnTo =
        optionalReturn !== undefined
          ? (hrefWithReturn(currentPathname, optionalReturn) as string)
          : currentPathname;
      router.push(hrefWithReturn(targetPathname, returnTo));
    },
    [router, optionalReturn, currentPathname],
  );

  return { goBack, pushWithCurrentAsReturn };
}
