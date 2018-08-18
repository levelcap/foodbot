#!/usr/bin/env node
const request = require('request-promise-native');
const cheerio = require("cheerio");
const _ = require('lodash');
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;

const allBase = 'https://www.allrecipes.com/recipe/';
const allIndexStart = 39305;
const allIndexEnd = 265000;
const johnsonville = 'Johnsonville® Three Cheese Italian Style Chicken Sausage Skillet Pizza';
const epicurious = 'https://services.epicurious.com/api/search/v1/query?q=&size=200000&include=&exclude=&content=recipe';

const yummlyBase = 'https://mapi.yummly.com/mapi/v16/content/search?start=';
const yummlyQuery = '&maxResult=1000&fetchUserCollections=false&allowedContent[]=single_recipe&guided-search=false&solr.view_type=search_internal';

const fnRecipeListBase = 'https://www.foodnetwork.com/recipes/recipes-a-z/';
const fnLetters = [
  '123', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'xyz'
];

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanLine(line) {
  line = line.replace(new RegExp('\n', 'g'), '');
  return line.replace(new RegExp('~', 'g'), '');
}

async function getGenius() {
  const options = {
    uri: `http://www.geniuskitchen.com/recipe/low-fat-banana-cream-delight-40000`,
    transform: (body) => {
      return cheerio.load(body);
    },
    maxRedirects: 5,
  };
  try {
    let recipeString = "";
    const $ = await request(options);
    const title = $('.recipe-header h1').text();
    if (!title) {
      return;
    }
    recipeString = recipeString.concat(`title:${cleanLine(title)}\n`);
    const author = $('.byline a').text().trim();
    recipeString = recipeString.concat(`author:${cleanLine(author)}\n\n`);

    recipeString = recipeString.concat(`categories:\n`);
    const category = $('.gk-breadcrumbs a').last().text();
    recipeString = recipeString.concat(`${cleanLine(category)}\n`);

    recipeString = recipeString.concat(`\ningredients:\n`);
    $('.ingredient-list li').each((i, list) => {
      const ingredientText = $(list).text().replace(new RegExp('  ', 'g'), ' ');
      if (ingredientText) {
        recipeString = recipeString.concat(`${cleanLine(ingredientText)}\n`);
      }
    });

    recipeString = recipeString.concat(`\ndirections:\n`);
    $('.directions-inner ol li').each((i, elem) => {
      const directionText = $(elem).text();
      if (directionText && !directionText.includes('Submit a Correction')) {
        recipeString = recipeString.concat(`${cleanLine(directionText)}\n`);
      }
    });
    recipeString = recipeString.concat(`\n~\n\n`);
    console.log(recipeString);
  } catch (err) {
    return;
  }
}

async function getAllRecipe(index, ws) {
  const options = {
    uri: `https://www.allrecipes.com/recipe/${index}`,
    transform: (body) => {
      return cheerio.load(body);
    },
    maxRedirects: 5,
  };
  try {
    const $ = await request(options);
    const title = $('.recipe-summary__h1').text();
    if (!title || title === johnsonville) {
      return;
    }
    ws.write(`title:${cleanLine(title)}\n`);
    const author = $('.submitter__name').text();
    ws.write(`author:${cleanLine(author)}\n\n`);

    ws.write(`categories:\n`);
    $('meta[itemprop="recipeCategory"]').each((i, elem) => {
      const category = $(elem).attr("content");
      ws.write(`${cleanLine(category)}\n`);
    });

    ws.write(`\ningredients:\n`);
    $('.recipe-ingred_txt').each((i, elem) => {
      const ingredientText = $(elem).text();
      if (ingredientText && ingredientText !== 'Add all ingredients to list') {
        ws.write(`${cleanLine(ingredientText)}\n`);
      }
    });

    ws.write(`\ndirections:\n`);
    $('.recipe-directions__list--item').each((i, elem) => {
      const directionText = $(elem).text();
      if (directionText) {
        ws.write(`${cleanLine(directionText)}\n`);
      }
    });
    ws.write(`\n~\n\n`);
    timeout(1000);
  } catch (err) {
    return;
  }
}

async function getFnRecipeLinksForIndexPage(url, ws) {
  const options = {
    uri: url,
    transform: (body) => {
      return cheerio.load(body);
    },
    maxRedirects: 5,
  };
  try {
    const $ = await request(options);
    const nextButton = $('.o-Pagination__a-NextButton');
    let nextUrl;
    if ($(nextButton).hasClass('is-Disabled')) {
      console.log('Next disabled');
    } else {
      nextUrl = 'https:' + $(nextButton).attr('href');
    }
    $('.m-PromoList__a-ListItem').each((i, elem) => {
      const recipeLink = $(elem).find('a').attr('href');
      ws.write(`https:${recipeLink}\n`);
    });

    if (nextUrl) {
      await getFnRecipeLinksForIndexPage(nextUrl, ws);
    }
  } catch (err) {
    return;
  }
}

getFnRecipeLinks = async () => {
  try {
    const fnStream = fs.createWriteStream('fnRecipeLinks.txt', {'flags': 'a'});
    for (let i = 0; i < fnLetters.length; i++) {
      const url = `${fnRecipeListBase}${fnLetters[i]}`;
      await getFnRecipeLinksForIndexPage(url, fnStream);
    }

    fnStream.end();
  } catch(err) {
    console.log(err);
  }
  return;
};

getFnRecipes = async () => {
  const fnStream = fs.createWriteStream('fnRecipes.txt', { 'flags': 'a' });

  const fnLineReader = require('readline').createInterface({
    input: require('fs').createReadStream('fnRecipeLinks.txt')
  });

  fnLineReader.on('line', async function (line) {
    const fnOptions = {
      uri: line,
      transform: (body) => {
        return cheerio.load(body);
      },
      maxRedirects: 5,
    };

    try {
      const $ = await request(fnOptions);
      const script = JSON.parse($('script[type="application/ld+json"]').html());
      let recipe = "";
      const title = script.name;
      recipe += `title:${cleanLine(title)}\n`;
      const author = script.author.name;
      console.log(script.author);
      recipe += `author:${cleanLine(author)}\n\n`;

      recipe += `categories:\n`;
      script.recipeCategory.forEach((category) => {
        recipe += `${cleanLine(category)}\n`;
      });

      recipe += `\ningredients:\n`;
      script.recipeIngredient.forEach((ingredientText) => {
        recipe += `${cleanLine(ingredientText)}\n`;
      });

      recipe += `\ndirections:\n`;
      script.recipeInstructions.forEach((directionText) => {
        recipe += `${cleanLine(directionText)}\n`;
      });
      recipe += `\n~\n\n`;
      fnStream.write(recipe);
    } catch (err) {
      console.log(err);
    }
  });
};

getAllRecipes = async () => {
  try {
    const arStream = fs.createWriteStream('allRecipes.txt', {'flags': 'a'});
    for (let i = allIndexStart; i < allIndexEnd; i++) {
      await getAllRecipe(i, arStream);
    }
    arStream.end();
  } catch(err) {
    console.log(err);
  }
  return;
};

getEpiRecipes = () => {
  const epiStream = fs.createWriteStream('epiRecipes.txt', { 'flags': 'a' });
  const epiOptions = {
    uri: epicurious,
    json: true,
    maxRedirects: 5,
  };
  request(epiOptions).then((recipes) => {
    recipes.items.forEach((recipe) => {
      const title = recipe.hed;
      epiStream.write(`title:${cleanLine(title)}\n`);
      let author = 'unknown';
      if (recipe.author[0]) {
        author = recipe.author[0].name;
      }
      epiStream.write(`author:${cleanLine(author)}\n\n`);

      epiStream.write(`categories:\n`);
      epiStream.write('unknown\n');

      epiStream.write(`\ningredients:\n`);
      recipe.ingredients.forEach((ingredientText) => {
        epiStream.write(`${cleanLine(ingredientText)}\n`);
      });

      epiStream.write(`\ndirections:\n`);
      recipe.prepSteps.forEach((directionText) => {
        epiStream.write(`${cleanLine(directionText)}\n`);
      });
    });
    epiStream.end();
  });
};

getYummlyJson = async () => {
    // let start = (i * 200);
    // if (start) {
    //   start += 1;
    // }
    const fileName = `yummly/yummly${96}.txt`;
    const options = {
      uri: `${yummlyBase}19800${yummlyQuery}`,
      json: true,
      maxRedirects: 1,
    };
    const json = await request(options);
    fs.writeFile(fileName, JSON.stringify(json), (err) => {
      if (err) throw err;
      console.log(`${fileName} file has been saved!`);
    });
  return;
};

readYummyJson = () => {
  const idSet = new Set();
  const ws = fs.createWriteStream('yummlyRecipes.txt', { 'flags': 'a' });
  for (let i = 0; i < 1027; i++) {
    const fileName = `yummly/yummly${i}.txt`;
    console.log(fileName);
    const fileJson = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    _.each(fileJson.feed, (item) => {
      const trackingId = item['tracking-id'];
      if (idSet.has(trackingId)) {
        console.log(`Already found id: ${trackingId}`);
        return;
      }
      idSet.add(trackingId);
      const author = item.content.details.displayName;
      const title = item.content.details.name;
      const categories = [];
      const tags = _.each(item.content.tags, (tag) => {
        _.each(tag, (category) => {
          categories.push(category['display-name']);
        })
      });

      const ingredients = _.map(item.content.ingredientLines, (ingredient) => ingredient.wholeLine);
      const directions = item.content.preparationSteps;

      if (directions) {
        console.log(title);
        ws.write(`title:${cleanLine(title)}\n`);
        ws.write(`author:${cleanLine(author)}\n\n`);

        ws.write(`categories:\n`);
        categories.forEach((category) => {
          ws.write(`${cleanLine(category)}\n`);
        });

        ws.write(`\ningredients:\n`);
        ingredients.forEach((ingredientText) => {
          ws.write(`${cleanLine(ingredientText)}\n`);
        });

        ws.write(`\ndirections:\n`);
        directions.forEach((direction) => {
          ws.write(`${cleanLine(direction)}\n`);
        });
        ws.write(`\n~\n\n`);
      }
    });
  }
  return;
};

readJson = async () => {
  const murl = 'mongodb://heroku_sc45bhlb:4ahudr65al8gd097939grgjh76@ds127443.mlab.com:27443/heroku_sc45bhlb';
  const ws = fs.createWriteStream('allRecipes.txt', { 'flags': 'a' });
  MongoClient.connect(murl, (proderr, primeProd) => {
    const rCol = primeProd.collection('recipes');
    rCol.find({}).forEach(function(doc) {
      console.log(doc.text);
      ws.write(doc.text);
    }, function(err) {
      console.log(err);
    });
  });
};

readJson().then(() => {
  console.log('Got it');
});

// getGenius().then(() => {
//   console.log('Got it');
// });

// getAllRecipes().then(() => {
//   console.log('AR Done');
// });

// getFnRecipeLinks().then(() => {
//   console.log('FN done');
// });

// getEpiRecipes();

// getYummlyJson();

// readYummyJson();

// getFnRecipes();


