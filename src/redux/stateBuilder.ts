import type { IStateSchema } from '../appTypes/states';
import { appStates } from './states';

const buildState = (state: IStateSchema) => {
  const { actions, entity } = state;

  const newActions = actions; // { add: {}}
  Object.keys(actions).forEach((key) => {
    if (actions[key]) {
      const action = `${key + entity}${actions[key].suffix || ''}`;
      newActions[key] = { ...actions[key], action };
    }
  });

  return newActions;
};

export const buildAppStates = () =>
  appStates.map((s) => ({ ...s, actions: buildState(s) }));
