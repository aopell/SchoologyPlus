import { Component } from 'solid-js';
import { createStore } from 'solid-js/store';

export class MountableElementsStore {
    private static instance = new MountableElementsStore();

    private mountableElements = createStore<Component[]>([]);

    private constructor() {}

    public static getInstance() {
        return this.instance;
    }

    public static getStoreRef() {
        return this.instance.mountableElements;
    }

    public static registerComponent(component: Component) {
        const [store, setStore] = this.instance.mountableElements;

        // Push the component to the store
        setStore([...store, component]);
    }

    public static removeComponent(component: Component) {
        const [store, setStore] = this.instance.mountableElements;

        // Remove the component from the store
        setStore(store.filter(c => c !== component));
    }
}

export const App: Component = () => {
    const [store] = MountableElementsStore.getStoreRef();
    return (
        <>
            {store.map(C => (
                <C />
            ))}
        </>
    );
};
