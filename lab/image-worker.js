// Browser-local worker. No network, storage, API keys, prompts or generation requests.
import { runImageTask } from './image-tools.js?v=20261010-seedream-pixels2';
let queue = Promise.resolve();
self.onmessage = ({ data }) => {
  queue = queue.catch(() => {}).then(async () => {
    try {
      const result = await runImageTask(data.operation, data.file);
      self.postMessage({ id: data.id, result });
    } catch (error) {
      self.postMessage({ id: data.id, error: error.message || 'Image preparation failed.', code: error.code || 'image-error' });
    }
  });
};
