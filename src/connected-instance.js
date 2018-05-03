import { connect, disconnect } from './model2.js';

export default function(instance, scope) {
  const update = () => instance.update(scope);

  Object.defineProperties(instance, {
    connect: {
      value() {
        scope.eachModel(model => connect(model, update));
      }
    },
    disconnect: {
      value() {
        scope.eachModel(model => disconnect(model, update));
      }
    }
  });

  return instance;
};
