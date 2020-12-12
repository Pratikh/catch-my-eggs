import './App.css';
import image from './assets/farm.jpg';

function App() {
  const { availHeight ,availWidth} = window.screen;
  return (
    <div className="App">
      <img src={image} alt={'Background'} className="backgroundImage" style={{
        width:availWidth,
        height:availHeight,
      }}></img>
    </div>
  );
}

export default App;
