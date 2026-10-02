import {Component, type ReactNode} from 'react';
import Editor from './Editor';

class Boundary extends Component<{children: ReactNode}, {message: string}> {
  state = {message: ''};

  static getDerivedStateFromError(error: Error) {
    return {message: error.message || '编辑器加载失败'};
  }

  render() {
    if (this.state.message) {
      return (
        <div className="grid h-dvh place-items-center bg-[#111418] p-6 text-sm text-white">
          {this.state.message}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function SkinRenderWidget() {
  return (
    <Boundary>
      <Editor />
    </Boundary>
  );
}
