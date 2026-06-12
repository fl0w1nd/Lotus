import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "./api";

/**
 * 登录态探测: /api/v1/profile 返回 200 且带用户 id 即视为已登录,
 * 游客请求该接口后端返回 401 (query 进入 error 态)。
 * 周期性轻量重查, 以便登录/登出后界面自动跟随。
 */
export function useIsLogin(): boolean {
  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
    retry: false,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
  return !!data?.data?.id;
}
