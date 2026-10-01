import Game from './components/Game';

/**
 * Thin app shell. All game concerns live in `<Game />`; this component only
 * exists so the app has a single obvious entry point (and an easy place to add
 * future routes/menus).
 */
const App = () => <Game />;

export default App;
