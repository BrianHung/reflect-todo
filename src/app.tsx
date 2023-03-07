import { nanoid } from "nanoid";
import { Reflect } from "@rocicorp/reflect";
import { useSubscribe } from "replicache-react";

import { M, mutators } from "./mutators";
import { listTodos, TodoUpdate } from "./todo";

import Header from "./components/header";
import MainSection from "./components/main-section";

import { useEffect } from "react"

const socketOrigin =
  import.meta.env.VITE_WORKER_URL ??
  "wss://reflect-todo.replicache.workers.dev";

// This is the top-level component for our app.
const App = ({ reflect, userID, roomID }: { reflect: Reflect<M> }) => {
  // Subscribe to all todos and sort them.
  const todos = useSubscribe(reflect, listTodos, [], [reflect]);
  todos.sort((a, b) => a.sort - b.sort);

  useEffect(() => {
    void (async() => {
      await reflect.mutate.init();

      const newId = nanoid();
      
      let entries = await reflect.query(tx => tx.scan().values().toArray())
      console.log("entries in 1st reflect", entries.length, entries.find(e => e.id == newId))

      await reflect.mutate.createTodo({
        id: newId,
        text: "hello world",
        completed: false,
      });

      entries = await reflect.query(tx => tx.scan().values().toArray())
      console.log("entries in 1st reflect", entries.length, entries.find(e => e.id == newId))

      const r = new Reflect({
        socketOrigin,
        userID,
        roomID,
        auth: userID,
        mutators,
      });

      entries = await r.query(tx => tx.scan().values().toArray())
      console.log("entries in 2nd reflect", entries.length, entries.find(e => e.id == newId))
    })();
  }, [])

  // Define event handlers and connect them to Replicache mutators. Each
  // of these mutators runs immediately (optimistically) locally, then runs
  // again on the server-side automatically.
  const handleNewItem = (text: string) =>
    reflect.mutate.createTodo({
      id: nanoid(),
      text,
      completed: false,
    });

  const handleUpdateTodo = (update: TodoUpdate) =>
    reflect.mutate.updateTodo(update);

  const handleDeleteTodos = async (ids: string[]) => {
    for (const id of ids) {
      await reflect.mutate.deleteTodo(id);
    }
  };

  const handleCompleteTodos = async (completed: boolean, ids: string[]) => {
    for (const id of ids) {
      await reflect.mutate.updateTodo({
        id,
        completed,
      });
    }
  };

  // Render app.

  return (
    <div className="todoapp">
      <Header onNewItem={handleNewItem} />
      <MainSection
        todos={todos}
        onUpdateTodo={handleUpdateTodo}
        onDeleteTodos={handleDeleteTodos}
        onCompleteTodos={handleCompleteTodos}
      />
    </div>
  );
};

export default App;
