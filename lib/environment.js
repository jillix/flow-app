module.exports = function (entrypoint, config) {

    let environment = {};

    entrypoint.env.forEach((name) => {
        let env = config.environments.find((env) => {
            return env.name === name;
        });

        if (!env) {
            throw new Error('Flow-app.environment: Entrypoint environment reference "' + name + '" does not exist.');
        }

        Object.assign(environment, env.vars);
    });

    entrypoint.env = environment;
};
