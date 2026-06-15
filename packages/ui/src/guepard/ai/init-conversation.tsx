import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from '../../ai-elements/prompt-input';
import { ChatStatus } from 'ai';

export interface QweryConversationInitProps {
  onSubmit: (message: PromptInputMessage) => void;
  input: string;
  setInput: (input: string) => void;
  status: ChatStatus | undefined;
}

export function QweryConversationInit(props: QweryConversationInitProps) {
  return (
    <div className="flex w-full shrink-0 items-end justify-center px-4 pt-6 pb-4">
      <div className="w-full max-w-3xl">
        <PromptInput
          onSubmit={props.onSubmit}
          className="w-full"
          globalDrop
          multiple
        >
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => props.setInput(e.target.value)}
              value={props.input}
              placeholder="Ask anything…"
              className="min-h-24"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit
              disabled={!props.input.trim() && !props.status}
              status={props.status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

export default QweryConversationInit;
