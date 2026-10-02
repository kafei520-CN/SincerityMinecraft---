import {useEffect} from 'react';
import {rememberTool} from '../lib/storage';

interface RememberToolProps {
  toolId: string;
}

/** 打开工具页时写入最近使用。 */
export default function RememberTool({toolId}: RememberToolProps) {
  useEffect(() => {
    rememberTool(toolId);
  }, [toolId]);
  return null;
}
