import { AutoRedirect } from "./AutoRedirect";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightToBracket, faArrowRightFromBracket } from "@fortawesome/free-solid-svg-icons";

interface Props {
  searchParams: Promise<{ result?: string }>;
}

export default async function ToggledPage({ searchParams }: Props) {
  const { result } = await searchParams;
  const entered = result === "entered";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <p className={`text-6xl ${entered ? "text-green-500" : "text-red-500"}`}>
          <FontAwesomeIcon icon={entered ? faArrowRightToBracket : faArrowRightFromBracket} />
        </p>
        <h1 className="text-2xl font-bold">
          {entered ? "入室しました" : "退室しました"}
        </h1>
        <p className="text-muted-foreground text-sm">
          3秒後にトップページへ移動します…
        </p>
        <AutoRedirect />
      </div>
    </div>
  );
}
