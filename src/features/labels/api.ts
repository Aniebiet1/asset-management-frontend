import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { LabelSheetLayout } from "@/types";

export function useLabelSheetLayoutQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["labels", "sheet-layout"],
    queryFn: () => apiFetch<{ data: LabelSheetLayout }>("/organizations/me/label-sheet-layout").then((r) => r.data),
    enabled: options?.enabled,
  });
}

export function useSaveLabelSheetLayoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (layout: LabelSheetLayout) =>
      apiFetch<{ data: LabelSheetLayout }>("/organizations/me/label-sheet-layout", {
        method: "PATCH",
        body: JSON.stringify(layout),
      }).then((r) => r.data),
    onSuccess: (layout) => {
      queryClient.setQueryData(["labels", "sheet-layout"], layout);
    },
  });
}
