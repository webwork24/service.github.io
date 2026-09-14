let userInfoCache = null;
let userInfoPromise = null;

async function getCachedUserInfo() {
    if (userInfoCache) {
        return userInfoCache;
    }
    if (userInfoPromise) {
        return userInfoPromise;
    }
    userInfoPromise = (async () => {
        try {
            const ipInfo = await getIpInfo();
            const userInfo = await getUserInfo(ipInfo);
            userInfoCache = {
                ip: String(userInfo?.ip ?? ''),
                region: String(userInfo?.region ?? ''),
                country: String(userInfo?.country ?? ''),
                countryCode: String(userInfo?.country_code ?? ''),
                city: String(userInfo?.city ?? ''),
                userAgent: String(
                    userInfo?.userAgent ?? navigator.userAgent ?? ''
                )
            };
            return userInfoCache;
        } catch (error) {
            console.error('Failed to get user info:', error);
            userInfoPromise = null;
            return {
                ip: '',
                region: '',
                country: '',
                countryCode: '',
                city: '',
                userAgent: navigator.userAgent || ''
            };
        }
    })();
    return userInfoPromise;
}

document.addEventListener('DOMContentLoaded', async function() {

    const activityCode = document
        .getElementById('activityScript')
        ?.getAttribute('activity-code');

    if (!activityCode) {
        return;
    }

    const userInfo = await getCachedUserInfo();

    await sendEvent({
        type: 'page_open',

        targetBaseURI: String(window.location.href),
        targetHost: String(window.location.host),
        targetOrigin: String(window.location.origin),

        ip: userInfo.ip,
        region: userInfo.region,
        country: userInfo.country,
        countryCode: userInfo.countryCode,
        city: userInfo.city,
        userAgent: userInfo.userAgent

    }, activityCode);

});

document.addEventListener('click', async function(event) {
    const activityCode = document
        .getElementById('activityScript')
        ?.getAttribute('activity-code');

    if (!activityCode || !needSendEvent(event)) {
        return;
    }

    const target = event.target;
    const userInfo = await getCachedUserInfo();

    await sendEvent({
        type: 'click',
        targetTagName: String(target?.tagName ?? ''),
        targetText: String(target?.textContent ?? ''),
        targetClassName: String(
            target?.getAttribute?.('class') ?? ''
        ),
        targetAttributes: getAttr(event),
        targetBaseURI: String(
            target?.baseURI ?? window.location.href
        ),
        targetHost: String(window.location.host),
        targetOuterHTML: String(
            target?.outerHTML ?? ''
        ),
        targetOuterText: String(
            target?.textContent ?? ''
        ),
        targetOrigin: String(window.location.origin),
        ip: userInfo.ip,
        region: userInfo.region,
        country: userInfo.country,
        countryCode: userInfo.countryCode,
        city: userInfo.city,
        userAgent: userInfo.userAgent
    }, activityCode);
});

function getAttr(event) {
    const target = event.target;

    if (!target?.attributes) {
        return [];
    }

    return Array.from(target.attributes).map(attr => [
        String(attr.name),
        String(attr.value)
    ]);
}

function sendEvent(data, activityCode) {

  const urlRef = 'https://activity.worker24.click/activity/save';
  const payload = {
    activityCode: activityCode,
    ...data
  };
    try {
        const response = await fetch(urlRef, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const responseText = await response.text();

            console.error('Failed to save activity:', {
                status: response.status,
                statusText: response.statusText,
                response: responseText,
                payload: payload
            });

            return false;
        }

        return true;

    } catch (err) {
        console.error('Network error while sending activity:', err);
        return false;
    }
}

async function getIpInfo() {
  const response = await fetch('https://scvqvhrdhwo46okrnera2u7p7m0svkrs.lambda-url.eu-central-1.on.aws');
  const data = await response.json();

  const ipInfo = {
    ip: data.ip
  };

  console.log(ipInfo);
  return ipInfo;
}

async function getUserInfo(ipInfo) {
  const userAgent = navigator.userAgent;

  const response = await fetch(
    `https://activity.worker24.click/ipinfo?ip=${encodeURIComponent(ipInfo.ip)}`
  );
  const data = await response.json();

  const userInfo = {
    ip: data.ip,
    region: data.region,
    country: data.country_name,
    countryCode: data.country_code,
    city: data.city,
    userAgent: userAgent
  };

  console.log(userInfo);
  return userInfo;
}

function needSendEvent(event) {
  const activityScript = document.getElementById("activityScript");
  const activityAccess = activityScript.hasAttribute("activity-access") 
      ? activityScript.getAttribute("activity-access") 
      : "full access";  // "no access"
  const nodeWithRuleExcept = traverseToRoot(event.target);
  
  if (activityAccess == "no access") {
      return nodeWithRuleExcept.hasAttribute("activity-access-rule-exception")
          && nodeWithRuleExcept.getAttribute("activity-access-rule-exception") == "true" ? true : false;
  }
  return nodeWithRuleExcept.hasAttribute("activity-access-rule-exception")
      && nodeWithRuleExcept.getAttribute("activity-access-rule-exception") == "true" ? false : true;
}

function traverseToRoot(node) {
  let current = node;
  while (current.parentNode && current.parentNode.attributes) {
    console.log(current.nodeName);
    if (current.hasAttribute("activity-access-rule-exception")) {
        return current;
    }
    current = current.parentNode;
  }
  return current;
}
