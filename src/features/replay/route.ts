import type { ClassicCareerState } from "../../domain/classicEngine";
import {
  parseDailyChallengeSeed,
  type DailyChallenge,
} from "../challenges/daily";
import { decodeReplayHash } from "./codec";
import { replayChallengePayload } from "./replay";

export type ReplayRouteErrorKind =
  | "corrupt"
  | "incompatible"
  | "tampered"
  | "unsupported";

export type ReplayRouteResult =
  | {
      readonly status: "absent";
    }
  | {
      readonly career: ClassicCareerState;
      readonly challenge: DailyChallenge;
      readonly status: "ready";
    }
  | {
      readonly detail: string;
      readonly kind: ReplayRouteErrorKind;
      readonly recovery: string;
      readonly status: "error";
      readonly title: string;
    };

const ABSENT_ROUTE: ReplayRouteResult = Object.freeze({
  status: "absent",
});

export function resolveReplayRoute(
  hash: string,
): ReplayRouteResult {
  if (!hash.startsWith("#r")) {
    return ABSENT_ROUTE;
  }

  const decoded = decodeReplayHash(hash);

  if (decoded.status === "invalid") {
    return routeError(
      "corrupt",
      "回放链接损坏",
      `Hash 数据未通过格式或完整性校验：${decoded.reason}。`,
      "请向分享者重新获取完整链接，不要手动补写或截断 Hash。",
    );
  }

  if (decoded.status === "unsupported") {
    switch (decoded.reason) {
      case "codec_version":
        return routeError(
          "unsupported",
          "回放版本暂不支持",
          `当前应用无法读取编码版本 ${String(decoded.codecVersion)}。`,
          "请使用创建该回放时的兼容应用版本，或请分享者生成新链接。",
        );
      case "content_version":
        return routeError(
          "unsupported",
          "内容版本不兼容",
          `当前应用未包含内容版本 ${String(decoded.contentVersion)}。`,
          "请使用创建该回放时的兼容应用版本。系统不会用其他内容近似重放。",
        );
      case "economy_policy":
        return routeError(
          "unsupported",
          "经济规则版本不兼容",
          `当前应用未包含经济规则 ${String(decoded.economyPolicyVersion)}。`,
          "请使用创建该回放时的兼容应用版本。系统不会用其他规则近似计算收入。",
        );
    }
  }

  const challenge = parseDailyChallengeSeed(
    decoded.payload.seed,
  );

  if (
    challenge === null ||
    challenge.id !== decoded.payload.challengeId
  ) {
    return routeError(
      "incompatible",
      "挑战信息不匹配",
      "回放中的挑战 ID、版本与确定性 seed 不是同一份挑战。",
      "请向分享者重新复制原始链接。应用不会猜测或替换挑战规则。",
    );
  }

  const replayed = replayChallengePayload(decoded.payload);

  if (replayed.status !== "ready") {
    return routeError(
      "tampered",
      "回放校验失败",
      replayFailureDetail(replayed),
      "该路径无法安全重建。请向分享者重新获取未经修改的完整链接。",
    );
  }

  if (
    replayed.career.phase !== "summary" ||
    replayed.career.summary === null
  ) {
    return routeError(
      "incompatible",
      "回放尚未完成",
      "该链接没有包含一条已结束的职业生涯路径。",
      "请在退役总结页重新生成挑战回放链接。",
    );
  }

  return Object.freeze({
    career: replayed.career,
    challenge,
    status: "ready",
  });
}

function replayFailureDetail(
  replayed: Exclude<
    ReturnType<typeof replayChallengePayload>,
    { status: "ready" }
  >,
): string {
  switch (replayed.reason) {
    case "choice_after_retirement":
      return `第 ${replayed.choiceIndex + 1} 个选择出现在退役之后。`;
    case "choice_not_available":
      return `第 ${replayed.choiceIndex + 1} 个选择不属于当时可用选项。`;
    case "choice_rejected":
      return `第 ${replayed.choiceIndex + 1} 个选择被确定性引擎拒绝。`;
    case "economy_policy":
      return "回放中的经济规则版本与当前应用不兼容。";
    case "invalid_setup":
      return "回放身份或初始设置无法被当前内容创建。";
    case "state_hash":
      return "重放后的最终状态与分享链接中的状态指纹不一致。";
  }
}

function routeError(
  kind: ReplayRouteErrorKind,
  title: string,
  detail: string,
  recovery: string,
): ReplayRouteResult {
  return Object.freeze({
    detail,
    kind,
    recovery,
    status: "error",
    title,
  });
}
