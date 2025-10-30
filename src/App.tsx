/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  USER_ID,
  getTodos,
  createTodo,
  deleteTodo,
  updateTodo,
} from './api/todos';
import { Todo } from './types/Todo';
import { TodoItem } from './components/TodoItem/TodoItem';

type FilterStatus = 'All' | 'Active' | 'Completed';
const TEMP_TODO_ID = 0;

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('All');
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loadingTodoIds, setLoadingTodoIds] = useState<number[]>([]);
  const newTodoFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const t = window.setTimeout(() => setErrorMessage(''), 3000);

    return () => window.clearTimeout(t);
  }, [errorMessage]);

  const hideError = () => setErrorMessage('');

  // ---- initial load ----
  useEffect(() => {
    setIsLoading(true);
    hideError();

    getTodos()
      .then(setTodos)
      .catch(() => setErrorMessage('Unable to load todos'))
      .finally(() => setIsLoading(false));
  }, []);

  // ---- focus ----
  useEffect(() => {
    newTodoFieldRef.current?.focus();
  }, [todos.length, isAdding, loadingTodoIds.length]);

  // ---- visible list ----
  const visibleTodos = useMemo(() => {
    let list = todos;

    if (filterStatus === 'Active') {
      list = todos.filter(t => !t.completed);
    }

    if (filterStatus === 'Completed') {
      list = todos.filter(t => t.completed);
    }

    if (isAdding && filterStatus !== 'Completed') {
      const trimmed = newTitle.trim();
      const temp: Todo = {
        id: TEMP_TODO_ID,
        userId: USER_ID,
        title: trimmed,
        completed: false,
      };

      list = [temp, ...list.filter(t => t.id !== TEMP_TODO_ID)];
    }

    return list;
  }, [todos, filterStatus, isAdding, newTitle]);

  // ---- create ----
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    hideError();

    const trimmed = newTitle.trim();

    if (!trimmed) {
      setErrorMessage('Title should not be empty');

      return;
    }

    setIsAdding(true);
    setLoadingTodoIds(prev => [...prev, TEMP_TODO_ID]);

    const tempTodo: Todo = {
      id: TEMP_TODO_ID,
      userId: USER_ID,
      title: trimmed,
      completed: false,
    };

    setTodos(prev => [...prev, tempTodo]);

    createTodo(trimmed)
      .then(created => {
        setTodos(prev =>
          prev.filter(t => t.id !== TEMP_TODO_ID).concat(created),
        );
        setNewTitle('');
      })
      .catch(() => {
        setErrorMessage('Unable to add a todo');
        setTodos(prev => prev.filter(t => t.id !== TEMP_TODO_ID));
      })
      .finally(() => {
        setIsAdding(false);
        setLoadingTodoIds(prev => prev.filter(id => id !== TEMP_TODO_ID));
      });
  };

  // ---- delete ----
  const handleDelete = (todoId: number) => {
    hideError();
    setLoadingTodoIds(prev => [...prev, todoId]);

    deleteTodo(todoId)
      .then(() => setTodos(prev => prev.filter(t => t.id !== todoId)))
      .catch(() => setErrorMessage('Unable to delete a todo'))
      .finally(() => {
        setLoadingTodoIds(prev => prev.filter(id => id !== todoId));
      });
  };

  // ---- toggle ----
  const handleToggle = (todo: Todo) => {
    hideError();
    const id = todo.id;

    setLoadingTodoIds(prev => [...prev, id]);
    const patched: Todo = { ...todo, completed: !todo.completed };

    updateTodo(patched)
      .then(updated => {
        setTodos(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      })
      .catch(() => setErrorMessage('Unable to update a todo'))
      .finally(() => {
        setLoadingTodoIds(prev => prev.filter(x => x !== id));
      });
  };

  // ---- rename ----
  const handleRename = (id: number, newTitleValue: string) => {
    hideError();
    setLoadingTodoIds(prev => [...prev, id]);

    const current = todos.find(t => t.id === id);

    if (!current) {
      setLoadingTodoIds(prev => prev.filter(x => x !== id));

      return;
    }

    updateTodo({ ...current, title: newTitleValue })
      .then(updated => {
        setTodos(prev => prev.map(t => (t.id === id ? updated : t)));
      })
      .catch(() => setErrorMessage('Unable to update a todo'))
      .finally(() => {
        setLoadingTodoIds(prev => prev.filter(x => x !== id));
      });
  };

  // ---- derived ----
  const activeTodosCount = todos.filter(t => !t.completed).length;
  const allCompleted = todos.length > 0 && activeTodosCount === 0;

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {!!todos.length && (
            <button
              type="button"
              className={`todoapp__toggle-all${allCompleted ? ' active' : ''}`}
              data-cy="ToggleAllButton"
              disabled
            />
          )}

          <form onSubmit={handleSubmit}>
            <input
              ref={newTodoFieldRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              disabled={isAdding}
            />
          </form>
        </header>

        {(!!todos.length || isLoading) && (
          <section className="todoapp__main" data-cy="TodoList">
            {isLoading && (
              <div data-cy="TodoLoader" className="modal overlay is-active">
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            )}

            {visibleTodos.map(todo => {
              const isRowLoading =
                loadingTodoIds.includes(todo.id) || todo.id === TEMP_TODO_ID;

              return (
                <TodoItem
                  key={todo.id === TEMP_TODO_ID ? 'temp' : todo.id}
                  todo={todo}
                  isLoading={isRowLoading}
                  onToggle={() => handleToggle(todo)}
                  onDelete={() => handleDelete(todo.id)}
                  onRename={handleRename}
                />
              );
            })}
          </section>
        )}

        {!!todos.length && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {activeTodosCount} items left
            </span>

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={`filter__link ${filterStatus === 'All' ? 'selected' : ''}`}
                data-cy="FilterLinkAll"
                onClick={() => setFilterStatus('All')}
              >
                All
              </a>

              <a
                href="#/active"
                className={`filter__link ${filterStatus === 'Active' ? 'selected' : ''}`}
                data-cy="FilterLinkActive"
                onClick={() => setFilterStatus('Active')}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={`filter__link ${filterStatus === 'Completed' ? 'selected' : ''}`}
                data-cy="FilterLinkCompleted"
                onClick={() => setFilterStatus('Completed')}
              >
                Completed
              </a>
            </nav>

            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!todos.some(t => t.completed)}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={`notification is-danger is-light has-text-weight-normal ${
          errorMessage ? '' : 'hidden'
        }`}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={hideError}
        />
        {errorMessage}
      </div>
    </div>
  );
};
